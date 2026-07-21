import hashlib
import hmac
import os
import time
from urllib.parse import urlencode

from fastapi import Header, HTTPException, Query, Request, status

DEVICE_SECRETS_RAW = os.environ.get("IOT_DEVICE_SECRETS", "").strip()
TIMESTAMP_TOLERANCE_SECONDS = int(os.environ.get("HMAC_TIMESTAMP_TOLERANCE_SECONDS", "300"))
NONCE_TTL_SECONDS = int(os.environ.get("HMAC_NONCE_TTL_SECONDS", "300"))

_used_nonces: dict[tuple[str, str], float] = {}


def _parse_device_secrets(raw: str) -> dict[str, str]:
    secrets: dict[str, str] = {}
    for item in raw.split(","):
        entry = item.strip()
        if not entry or ":" not in entry:
            continue
        device_id, secret = entry.split(":", 1)
        device_id = device_id.strip()
        secret = secret.strip()
        if device_id and secret:
            secrets[device_id] = secret
    return secrets


DEVICE_SECRETS = _parse_device_secrets(DEVICE_SECRETS_RAW)


def is_auth_enabled() -> bool:
    return bool(DEVICE_SECRETS)


def _cleanup_expired_nonces(now: float) -> None:
    expired_keys = [key for key, expires_at in _used_nonces.items() if expires_at <= now]
    for key in expired_keys:
        _used_nonces.pop(key, None)


def _validate_timestamp(timestamp_value: str | None, now: float) -> str:
    if not timestamp_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing HMAC timestamp",
        )
    try:
        timestamp = int(timestamp_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid HMAC timestamp",
        ) from exc

    if abs(now - timestamp) > TIMESTAMP_TOLERANCE_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired HMAC timestamp",
        )
    return str(timestamp)


def _validate_nonce(device_id: str, nonce: str | None, now: float) -> str:
    if not nonce:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing HMAC nonce",
        )

    _cleanup_expired_nonces(now)
    nonce_key = (device_id, nonce)
    if nonce_key in _used_nonces:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Replay detected",
        )
    return nonce


def _body_hash(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def _canonical_path_with_query(request: Request, excluded_query_keys: set[str] | None = None) -> str:
    excluded_query_keys = excluded_query_keys or set()
    query_items = [
        (key, value)
        for key, value in request.query_params.multi_items()
        if key not in excluded_query_keys
    ]
    if not query_items:
        return request.url.path
    return f"{request.url.path}?{urlencode(query_items, doseq=True)}"


def _canonical_request(method: str, path_with_query: str, timestamp: str, nonce: str, body: bytes) -> str:
    return "\n".join(
        [
            method.upper(),
            path_with_query,
            timestamp,
            nonce,
            _body_hash(body),
        ]
    )


def _expected_signature(secret: str, canonical_request: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        canonical_request.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _verify_signature(
    *,
    request: Request,
    device_id: str | None,
    timestamp_value: str | None,
    nonce_value: str | None,
    signature: str | None,
    body: bytes,
    excluded_query_keys: set[str] | None = None,
) -> None:
    if not is_auth_enabled():
        return

    if not device_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing device ID",
        )

    secret = DEVICE_SECRETS.get(device_id)
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown device ID",
        )

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing HMAC signature",
        )

    now = time.time()
    timestamp = _validate_timestamp(timestamp_value, now)
    nonce = _validate_nonce(device_id, nonce_value, now)
    path_with_query = _canonical_path_with_query(request, excluded_query_keys)
    canonical = _canonical_request(request.method, path_with_query, timestamp, nonce, body)
    expected = _expected_signature(secret, canonical)

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid HMAC signature",
        )

    _used_nonces[(device_id, nonce)] = now + NONCE_TTL_SECONDS


async def require_hmac_signature(
    request: Request,
    x_device_id: str | None = Header(None, alias="X-Device-Id"),
    x_timestamp: str | None = Header(None, alias="X-Timestamp"),
    x_nonce: str | None = Header(None, alias="X-Nonce"),
    x_signature: str | None = Header(None, alias="X-Signature"),
) -> None:
    body = await request.body()
    _verify_signature(
        request=request,
        device_id=x_device_id,
        timestamp_value=x_timestamp,
        nonce_value=x_nonce,
        signature=x_signature,
        body=body,
    )


async def require_hmac_query(
    request: Request,
    device_id: str | None = Query(None),
    timestamp: str | None = Query(None),
    nonce: str | None = Query(None),
    signature: str | None = Query(None),
) -> None:
    _verify_signature(
        request=request,
        device_id=device_id,
        timestamp_value=timestamp,
        nonce_value=nonce,
        signature=signature,
        body=b"",
        excluded_query_keys={"device_id", "timestamp", "nonce", "signature"},
    )


require_api_key = require_hmac_signature
