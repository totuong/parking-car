import asyncio
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone

from models import SlotTelemetry


@dataclass
class FrameSnapshot:
    frame_id: int | None = None
    source_frame_id: str | None = None
    split: str | None = None
    image_bytes: bytes | None = None
    payload: list[SlotTelemetry] = field(default_factory=list)
    received_at: datetime | None = None
    sequence: int = 0


class FrameState:
    def __init__(self):
        self._lock = threading.Lock()
        self._snapshot = FrameSnapshot()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._update_event: asyncio.Event | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._update_event = asyncio.Event()

    def update(
        self,
        frame_id: int,
        source_frame_id: str,
        split: str,
        image_bytes: bytes,
        payload: list[SlotTelemetry],
    ) -> int:
        with self._lock:
            self._snapshot = FrameSnapshot(
                frame_id=frame_id,
                source_frame_id=source_frame_id,
                split=split,
                image_bytes=image_bytes,
                payload=payload,
                received_at=datetime.now(timezone.utc),
                sequence=self._snapshot.sequence + 1,
            )
            sequence = self._snapshot.sequence

        if self._loop and self._update_event:
            self._loop.call_soon_threadsafe(self._update_event.set)

        return sequence

    def update_payload(
        self,
        frame_id: int,
        source_frame_id: str,
        split: str,
        payload: list[SlotTelemetry],
        image_bytes: bytes | None = None,
    ) -> int:
        """Update slot telemetry; keep existing MJPEG image unless a new one is provided."""
        with self._lock:
            self._snapshot = FrameSnapshot(
                frame_id=frame_id,
                source_frame_id=source_frame_id,
                split=split,
                image_bytes=image_bytes if image_bytes is not None else self._snapshot.image_bytes,
                payload=payload,
                received_at=datetime.now(timezone.utc),
                sequence=self._snapshot.sequence + 1,
            )
            sequence = self._snapshot.sequence

        if self._loop and self._update_event:
            self._loop.call_soon_threadsafe(self._update_event.set)

        return sequence

    def snapshot(self) -> FrameSnapshot:
        with self._lock:
            return FrameSnapshot(
                frame_id=self._snapshot.frame_id,
                source_frame_id=self._snapshot.source_frame_id,
                split=self._snapshot.split,
                image_bytes=self._snapshot.image_bytes,
                payload=list(self._snapshot.payload),
                received_at=self._snapshot.received_at,
                sequence=self._snapshot.sequence,
            )

    async def wait_for_update(self, last_sequence: int) -> FrameSnapshot:
        if not self._update_event:
            await asyncio.sleep(0.5)
            return self.snapshot()

        while True:
            current = self.snapshot()
            if current.sequence > last_sequence and current.image_bytes:
                return current
            self._update_event.clear()
            await self._update_event.wait()
