import asyncio

from fastapi.responses import StreamingResponse

from frame_state import FrameState

BOUNDARY = "parkingframe"


def multipart_chunk(content_type: str, payload: bytes) -> bytes:
    header = (
        f"--{BOUNDARY}\r\n"
        f"Content-Type: {content_type}\r\n"
        f"Content-Length: {len(payload)}\r\n\r\n"
    ).encode("utf-8")
    return header + payload + b"\r\n"


async def mjpeg_generator(frame_state: FrameState):
    last_sequence = 0
    while True:
        snapshot = await frame_state.wait_for_update(last_sequence)
        if not snapshot.image_bytes:
            await asyncio.sleep(0.1)
            continue

        if snapshot.sequence <= last_sequence:
            continue

        last_sequence = snapshot.sequence
        yield multipart_chunk("image/jpeg", snapshot.image_bytes)


def create_mjpeg_response(frame_state: FrameState) -> StreamingResponse:
    return StreamingResponse(
        mjpeg_generator(frame_state),
        media_type=f"multipart/x-mixed-replace; boundary={BOUNDARY}",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
