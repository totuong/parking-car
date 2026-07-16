"""Pull MJPEG from the simulated camera and update FrameState."""

from __future__ import annotations

import asyncio
import logging
import os
import re

import httpx

from frame_state import FrameState

logger = logging.getLogger(__name__)

JPEG_SOI = b"\xff\xd8"
JPEG_EOI = b"\xff\xd9"
BOUNDARY_RE = re.compile(rb"boundary=([^;\s]+)", re.IGNORECASE)
SOURCE_FRAME_RE = re.compile(rb"X-Source-Frame-Id:\s*(\S+)", re.IGNORECASE)


def _extract_boundary(content_type: str | None) -> bytes | None:
    if not content_type:
        return None
    match = BOUNDARY_RE.search(content_type.encode("utf-8", errors="ignore"))
    if not match:
        return None
    value = match.group(1).strip()
    if value.startswith(b'"') and value.endswith(b'"'):
        value = value[1:-1]
    return value


def _split_headers_and_body(part: bytes) -> tuple[bytes, bytes]:
    if b"\r\n\r\n" in part:
        headers, body = part.split(b"\r\n\r\n", 1)
        return headers, body
    if b"\n\n" in part:
        headers, body = part.split(b"\n\n", 1)
        return headers, body
    return b"", part


def _extract_jpeg(body: bytes) -> bytes | None:
    start = body.find(JPEG_SOI)
    end = body.rfind(JPEG_EOI)
    if start < 0 or end < 0 or end < start:
        return None
    return body[start : end + 2]


async def consume_camera_mjpeg(
    stream_url: str,
    frame_state: FrameState,
    reconnect_delay_seconds: float = 2.0,
    stream_secret: str | None = None,
):
    """Long-lived pull of multipart MJPEG; reconnects on failure."""
    frame_counter = 0
    secret = (stream_secret if stream_secret is not None else os.environ.get("CAMERA_STREAM_SECRET", "")).strip()
    headers = {"X-API-Key": secret} if secret else None
    logger.info(
        "Camera MJPEG consumer starting: %s auth=%s",
        stream_url,
        "enabled" if secret else "disabled",
    )

    while True:
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("GET", stream_url, headers=headers) as response:
                    response.raise_for_status()
                    boundary = _extract_boundary(response.headers.get("content-type"))
                    if not boundary:
                        logger.error("Camera stream missing multipart boundary: %s", stream_url)
                        await asyncio.sleep(reconnect_delay_seconds)
                        continue

                    delimiter = b"--" + boundary
                    buffer = b""
                    logger.info("Camera MJPEG connected: %s boundary=%s", stream_url, boundary.decode())

                    async for chunk in response.aiter_bytes():
                        if not chunk:
                            continue
                        buffer += chunk
                        while True:
                            start = buffer.find(delimiter)
                            if start < 0:
                                # Keep a small tail in case delimiter is split across chunks.
                                if len(buffer) > 1024 * 1024:
                                    buffer = buffer[-64:]
                                break
                            end = buffer.find(delimiter, start + len(delimiter))
                            if end < 0:
                                buffer = buffer[start:]
                                break

                            part = buffer[start + len(delimiter) : end]
                            buffer = buffer[end:]
                            if part.startswith(b"--"):
                                # Final boundary.
                                raise ConnectionError("Camera closed MJPEG stream")
                            part = part.lstrip(b"\r\n")
                            if not part or part.strip() == b"--":
                                continue

                            part_headers, body = _split_headers_and_body(part)
                            jpeg = _extract_jpeg(body)
                            if not jpeg:
                                continue

                            frame_counter += 1
                            source_match = SOURCE_FRAME_RE.search(part_headers)
                            source_frame_id = (
                                source_match.group(1).decode("utf-8", errors="ignore")
                                if source_match
                                else f"{frame_counter:04d}"
                            )

                            current = frame_state.snapshot()
                            frame_state.update(
                                frame_id=current.frame_id or frame_counter,
                                source_frame_id=source_frame_id,
                                split=current.split or "live",
                                image_bytes=jpeg,
                                payload=list(current.payload),
                            )

        except asyncio.CancelledError:
            logger.info("Camera MJPEG consumer stopped")
            raise
        except Exception as exc:
            logger.warning(
                "Camera MJPEG disconnected (%s); retry in %ss",
                exc,
                reconnect_delay_seconds,
            )
            await asyncio.sleep(reconnect_delay_seconds)
