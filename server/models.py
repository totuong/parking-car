from pydantic import BaseModel


class SlotTelemetry(BaseModel):
    frame_id: int
    id: str
    occupied: int
    timestamp: int


class FrameMessage(BaseModel):
    split: str
    frame_id: int
    source_frame_id: str
    image: str
    payload: list[SlotTelemetry]


class TelemetryBroadcast(BaseModel):
    frame_id: int
    source_frame_id: str
    split: str
    payload: list[SlotTelemetry]
