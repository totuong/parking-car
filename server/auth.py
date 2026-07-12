import os

from fastapi import Header, HTTPException, Query, status

API_SECRET = os.environ.get("API_SECRET", "").strip()


def is_auth_enabled() -> bool:
    return bool(API_SECRET)


def _token_matches(token: str | None) -> bool:
    if not is_auth_enabled():
        return True
    return bool(token) and token == API_SECRET


def require_api_key(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    token: str | None = Query(None),
) -> None:
    if not is_auth_enabled():
        return
    if _token_matches(x_api_key) or _token_matches(token):
        return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key",
    )
