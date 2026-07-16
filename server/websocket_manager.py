import asyncio
import logging

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from models import TelemetryBroadcast

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    @property
    def client_count(self) -> int:
        return len(self._clients)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._clients.add(websocket)
        logger.info("WebSocket client connected (%s total)", len(self._clients))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(websocket)
        logger.info("WebSocket client disconnected (%s total)", len(self._clients))

    async def broadcast(self, telemetry: TelemetryBroadcast) -> None:
        message = telemetry.model_dump()
        async with self._lock:
            clients = list(self._clients)

        stale: list[WebSocket] = []
        for client in clients:
            try:
                await client.send_json(message)
            except (WebSocketDisconnect, RuntimeError):
                stale.append(client)
            except Exception:
                logger.exception("Failed to send WebSocket message")
                stale.append(client)

        if stale:
            async with self._lock:
                for client in stale:
                    self._clients.discard(client)
