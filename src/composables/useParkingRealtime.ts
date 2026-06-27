import { ref, type Ref } from 'vue'
import type { Slot } from '../module/type'
import type { FrameMessage, TelemetryBroadcast, BridgeHealth } from '../module/mqtt'

const isConnected = ref(false)
const mqttConnected = ref(false)
const currentFrameId = ref<number | null>(null)
const liveMode = ref(true)

let socket: WebSocket | null = null
let reconnectTimer: number | undefined
let healthTimer: number | undefined
let reconnectAttempt = 0
let slotsRef: Ref<Slot[]> | null = null

function wsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/telemetry`
}

export function applyRealtimeMessage(msg: FrameMessage | TelemetryBroadcast, slots: Ref<Slot[]>) {
  currentFrameId.value = msg.frame_id

  for (const record of msg.payload) {
    const slot = slots.value.find((s) => s.id === record.id)
    if (!slot) continue

    const wasOccupied = slot.occupied
    slot.occupied = record.occupied === 1
    slot.timestamp = record.timestamp * 1000

    if (!wasOccupied && slot.occupied) {
      slot.carType = slot.carType ?? 'Sedan'
      slot.carColor = slot.carColor ?? 'Silver'
    } else if (wasOccupied && !slot.occupied) {
      delete slot.carType
      delete slot.carColor
    }
  }
}

async function pollHealth() {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) return
    const health = (await response.json()) as BridgeHealth
    mqttConnected.value = health.mqtt_connected
    if (health.last_frame_id != null) {
      currentFrameId.value = health.last_frame_id
    }
  } catch {
    mqttConnected.value = false
  }
}

function scheduleReconnect() {
  if (reconnectTimer) window.clearTimeout(reconnectTimer)
  const delay = Math.min(1000 * 2 ** reconnectAttempt, 15000)
  reconnectAttempt += 1
  reconnectTimer = window.setTimeout(() => {
    connectRealtime()
  }, delay)
}

function connectRealtime() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  socket = new WebSocket(wsUrl())

  socket.onopen = () => {
    isConnected.value = true
    reconnectAttempt = 0
  }

  socket.onmessage = (event) => {
    if (!slotsRef) return
    try {
      const message = JSON.parse(event.data) as TelemetryBroadcast
      applyRealtimeMessage(message, slotsRef)
    } catch {
      // ignore malformed payloads
    }
  }

  socket.onclose = () => {
    isConnected.value = false
    scheduleReconnect()
  }

  socket.onerror = () => {
    isConnected.value = false
    socket?.close()
  }
}

export function useParkingRealtime() {
  function connect(slots: Ref<Slot[]>) {
    slotsRef = slots
    connectRealtime()

    if (healthTimer) window.clearInterval(healthTimer)
    pollHealth()
    healthTimer = window.setInterval(pollHealth, 5000)
  }

  function disconnect() {
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    if (healthTimer) window.clearInterval(healthTimer)
    reconnectTimer = undefined
    healthTimer = undefined
    socket?.close()
    socket = null
    isConnected.value = false
    mqttConnected.value = false
    slotsRef = null
  }

  return {
    isConnected,
    mqttConnected,
    currentFrameId,
    liveMode,
    connect,
    disconnect,
    applyRealtimeMessage,
  }
}
