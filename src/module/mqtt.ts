export type SlotTelemetry = {
  frame_id: number
  id: string
  occupied: 0 | 1
  timestamp: number
}

export type FrameMessage = {
  split: string
  frame_id: number
  source_frame_id: string
  image: string
  payload: SlotTelemetry[]
}

export type TelemetryBroadcast = {
  frame_id: number
  source_frame_id: string
  split: string
  payload: SlotTelemetry[]
}

export type BridgeHealth = {
  mqtt_connected: boolean
  last_frame_id: number | null
  last_source_frame_id: string | null
  clients: number
  indexed_frames: number
}
