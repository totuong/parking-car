import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from analytics import fetch_analytics_summary
from frame_resolver import FrameResolver
from frame_state import FrameState
from mjpeg_stream import create_mjpeg_response
from models import TelemetryBroadcast
from mqtt_client import MqttBridge
from websocket_manager import WebSocketManager

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

SERVER_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_PATH = SERVER_DIR.parent.parent / "20252B-digital-twin" / "data_clean"

MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "parking/frames")
FRAMES_DATASET_PATH = Path(os.environ.get("FRAMES_DATASET_PATH", str(DEFAULT_DATASET_PATH)))

frame_state = FrameState()
frame_resolver = FrameResolver(FRAMES_DATASET_PATH)
ws_manager = WebSocketManager()
mqtt_bridge: MqttBridge | None = None


async def broadcast_telemetry(telemetry: TelemetryBroadcast):
    await ws_manager.broadcast(telemetry)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global mqtt_bridge
    loop = asyncio.get_running_loop()
    frame_state.bind_loop(loop)

    mqtt_bridge = MqttBridge(
        host=MQTT_HOST,
        port=MQTT_PORT,
        topic=MQTT_TOPIC,
        frame_resolver=frame_resolver,
        frame_state=frame_state,
        on_telemetry=broadcast_telemetry,
    )
    mqtt_bridge.start(loop)
    logger.info("Parking bridge started")
    yield
    if mqtt_bridge:
        mqtt_bridge.stop()


app = FastAPI(title="Parking Car Bridge", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    snapshot = frame_state.snapshot()
    return {
        "mqtt_connected": bool(mqtt_bridge and mqtt_bridge.connected),
        "last_frame_id": snapshot.frame_id,
        "last_source_frame_id": snapshot.source_frame_id,
        "clients": ws_manager.client_count,
        "indexed_frames": frame_resolver.indexed_frames,
    }


@app.get("/api/analytics/summary")
async def analytics_summary():
    return fetch_analytics_summary()


@app.get("/api/telemetry/latest")
async def telemetry_latest():
    snapshot = frame_state.snapshot()
    return {
        "frame_id": snapshot.frame_id,
        "source_frame_id": snapshot.source_frame_id,
        "split": snapshot.split,
        "payload": [item.model_dump() for item in snapshot.payload],
        "received_at": snapshot.received_at.isoformat() if snapshot.received_at else None,
    }


@app.get("/api/frames/{source_frame_id}.jpg")
async def get_frame(source_frame_id: str):
    path = frame_resolver.get_indexed_path(source_frame_id)
    if not path or not path.is_file():
        snapshot = frame_state.snapshot()
        if snapshot.source_frame_id == source_frame_id and snapshot.image_bytes:
            return Response(content=snapshot.image_bytes, media_type="image/jpeg")
        return Response(status_code=404, content="Frame not found")

    return Response(content=path.read_bytes(), media_type="image/jpeg")


@app.get("/api/stream/mjpeg")
async def stream_mjpeg():
    return create_mjpeg_response(frame_state)


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
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
