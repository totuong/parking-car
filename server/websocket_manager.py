import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

from models import TelemetryBroadcast

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self._connections.discard(websocket)

    @property
    def client_count(self) -> int:
        return len(self._connections)

    async def broadcast(self, payload: TelemetryBroadcast | dict[str, Any]):
        message = payload.model_dump() if isinstance(payload, TelemetryBroadcast) else payload
        encoded = json.dumps(message)
        async with self._lock:
            connections = list(self._connections)

        stale: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_text(encoded)
            except Exception:
                stale.append(websocket)

        for websocket in stale:
            await self.disconnect(websocket)
