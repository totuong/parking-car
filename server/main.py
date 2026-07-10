import asyncio
import base64
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from analytics import fetch_analytics_summary
from auth import is_auth_enabled, require_api_key, verify_ws_token
from frame_resolver import FrameResolver, IndexedFrame
from frame_state import FrameState
from mjpeg_stream import create_mjpeg_response
from models import FrameMessage, TelemetryBroadcast
from websocket_manager import WebSocketManager

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

SERVER_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_PATH = SERVER_DIR.parent.parent / "20252B-digital-twin" / "data_clean"


def _resolve_dataset_path() -> Path:
    raw = os.environ.get("FRAMES_DATASET_PATH", "").strip()
    if not raw:
        return DEFAULT_DATASET_PATH.resolve()
    path = Path(raw)
    if not path.is_absolute():
        path = (SERVER_DIR / path).resolve()
    return path


FRAMES_DATASET_PATH = _resolve_dataset_path()
INGEST_STALE_SECONDS = int(os.environ.get("INGEST_STALE_SECONDS", "5"))
FRAME_POLL_INTERVAL_SECONDS = float(os.environ.get("FRAME_POLL_INTERVAL_SECONDS", "1"))
FRAME_LOOP_DATASET = os.environ.get("FRAME_LOOP_DATASET", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


def _parse_cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if not raw:
        return DEFAULT_CORS_ORIGINS
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


CORS_ORIGINS = _parse_cors_origins()

frame_state = FrameState()
frame_resolver = FrameResolver(FRAMES_DATASET_PATH)
ws_manager = WebSocketManager()
poller_task: asyncio.Task | None = None
poller_enabled = frame_resolver.indexed_frames > 0
poller_running = False


async def broadcast_telemetry(telemetry: TelemetryBroadcast):
    await ws_manager.broadcast(telemetry)


def _is_recent(snapshot_received_at: datetime | None) -> bool:
    if not snapshot_received_at:
        return False
    age_seconds = (datetime.now(timezone.utc) - snapshot_received_at).total_seconds()
    return age_seconds <= INGEST_STALE_SECONDS


def _decode_image_bytes(image_value: str, frame_message: FrameMessage) -> bytes | None:
    raw = (image_value or "").strip()
    if not raw:
        return None

    # Upload API may send a local path instead of base64 during migration.
    file_candidate = Path(raw)
    if file_candidate.is_file():
        return file_candidate.read_bytes()

    if raw.startswith("data:"):
        _, _, raw = raw.partition(",")

    try:
        return base64.b64decode(raw, validate=True)
    except Exception:
        # Allow URL-safe/newline-padded base64 inputs from edge devices.
        normalized = raw.replace("\n", "").replace("\r", "").replace(" ", "")
        padding = (-len(normalized)) % 4
        if padding:
            normalized += "=" * padding
        try:
            return base64.b64decode(normalized)
        except Exception:
            return frame_resolver.read_bytes(frame_message)


async def process_polled_frame(frame: IndexedFrame):
    if not frame.path.is_file():
        logger.warning(
            "Polled frame missing on disk: frame_id=%s source_frame_id=%s path=%s",
            frame.frame_id,
            frame.source_frame_id,
            frame.path,
        )
        return

    image_bytes = frame.path.read_bytes()
    frame_state.update(
        frame_id=frame.frame_id,
        source_frame_id=frame.source_frame_id,
        split=frame.split,
        image_bytes=image_bytes,
        payload=[],
    )

    telemetry = TelemetryBroadcast(
        frame_id=frame.frame_id,
        source_frame_id=frame.source_frame_id,
        split=frame.split,
        payload=[],
    )
    await broadcast_telemetry(telemetry)


async def process_frame_message(frame_message: FrameMessage):
    image_bytes = _decode_image_bytes(frame_message.image, frame_message)
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing or invalid image payload",
        )

    frame_state.update(
        frame_id=frame_message.frame_id,
        source_frame_id=frame_message.source_frame_id,
        split=frame_message.split,
        image_bytes=image_bytes,
        payload=frame_message.payload,
    )

    telemetry = TelemetryBroadcast(
        frame_id=frame_message.frame_id,
        source_frame_id=frame_message.source_frame_id,
        split=frame_message.split,
        payload=frame_message.payload,
    )
    await broadcast_telemetry(telemetry)


async def poll_dataset_frames():
    global poller_running

    ordered_frames = frame_resolver.ordered_frames()
    if not ordered_frames:
        logger.warning("Polling disabled: no indexed frames found in %s", FRAMES_DATASET_PATH)
        return

    poller_running = True
    logger.info(
        "Dataset polling started: frames=%s interval=%ss loop=%s path=%s",
        len(ordered_frames),
        FRAME_POLL_INTERVAL_SECONDS,
        FRAME_LOOP_DATASET,
        FRAMES_DATASET_PATH,
    )
    try:
        while True:
            for frame in ordered_frames:
                await process_polled_frame(frame)
                await asyncio.sleep(FRAME_POLL_INTERVAL_SECONDS)
            if not FRAME_LOOP_DATASET:
                logger.info("Dataset polling finished after one pass through indexed frames")
                return
    except asyncio.CancelledError:
        logger.info("Dataset polling stopped")
        raise
    finally:
        poller_running = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global poller_task
    loop = asyncio.get_running_loop()
    frame_state.bind_loop(loop)

    if is_auth_enabled():
        logger.info("API auth enabled; CORS origins=%s", CORS_ORIGINS)
    else:
        logger.warning("API auth disabled (API_SECRET not set)")
    if poller_enabled:
        poller_task = asyncio.create_task(poll_dataset_frames(), name="dataset-frame-poller")
    else:
        logger.warning("Parking bridge started without polling source; no indexed frames available")
    logger.info("Parking bridge started in polling mode")
    yield
    if poller_task:
        poller_task.cancel()
        try:
            await poller_task
        except asyncio.CancelledError:
            pass
        poller_task = None


app = FastAPI(title="Parking Car Bridge", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    snapshot = frame_state.snapshot()
    return {
        "mqtt_connected": _is_recent(snapshot.received_at),
        "mqtt_auth_required": False,
        "mqtt_auth_configured": False,
        "mqtt_username": None,
        "ingest_mode": "polling",
        "ingest_connected": _is_recent(snapshot.received_at),
        "poller_enabled": poller_enabled,
        "poller_running": poller_running,
        "frame_poll_interval_seconds": FRAME_POLL_INTERVAL_SECONDS,
        "frame_loop_dataset": FRAME_LOOP_DATASET,
        "last_frame_id": snapshot.frame_id,
        "last_source_frame_id": snapshot.source_frame_id,
        "clients": ws_manager.client_count,
        "indexed_frames": frame_resolver.indexed_frames,
    }


@app.get("/api/analytics/summary")
async def analytics_summary(_: None = Depends(require_api_key)):
    return fetch_analytics_summary()


@app.get("/api/telemetry/latest")
async def telemetry_latest(_: None = Depends(require_api_key)):
    snapshot = frame_state.snapshot()
    return {
        "frame_id": snapshot.frame_id,
        "source_frame_id": snapshot.source_frame_id,
        "split": snapshot.split,
        "payload": [item.model_dump() for item in snapshot.payload],
        "received_at": snapshot.received_at.isoformat() if snapshot.received_at else None,
    }


@app.post("/api/telemetry/frame")
async def ingest_frame(
    frame_message: FrameMessage,
    _: None = Depends(require_api_key),
):
    await process_frame_message(frame_message)
    return {"ok": True, "frame_id": frame_message.frame_id}


@app.get("/api/frames/{source_frame_id}.jpg")
async def get_frame(source_frame_id: str, _: None = Depends(require_api_key)):
    path = frame_resolver.get_indexed_path(source_frame_id)
    if not path or not path.is_file():
        snapshot = frame_state.snapshot()
        if snapshot.source_frame_id == source_frame_id and snapshot.image_bytes:
            return Response(content=snapshot.image_bytes, media_type="image/jpeg")
        return Response(status_code=404, content="Frame not found")

    return Response(content=path.read_bytes(), media_type="image/jpeg")


@app.get("/api/stream/mjpeg")
async def stream_mjpeg(_: None = Depends(require_api_key)):
    return create_mjpeg_response(frame_state)


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    if not verify_ws_token(websocket):
        await websocket.close(code=4401, reason="Unauthorized")
        return

    await ws_manager.connect(websocket)
    snapshot = frame_state.snapshot()
    if snapshot.frame_id is not None:
        await websocket.send_json(
            TelemetryBroadcast(
                frame_id=snapshot.frame_id,
                source_frame_id=snapshot.source_frame_id or "",
                split=snapshot.split or "",
                payload=snapshot.payload,
            ).model_dump()
        )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
