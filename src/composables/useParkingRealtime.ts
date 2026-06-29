import { ref, type Ref } from 'vue'
import type { Slot } from '../module/type'
import type { FrameMessage, TelemetryBroadcast, BridgeHealth } from '../module/mqtt'
import { withApiToken } from '../utils/api'

const isConnected = ref(false)
const mqttConnected = ref(false)
const currentFrameId = ref<number | null>(null)
const liveMode = ref(true)

let socket: WebSocket | null = null
let reconnectTimer: number | undefined
let healthTimer: number | undefined
let reconnectAttempt = 0
let slotsRef: Ref<Slot[]> | null = null

const carTypes = ['Sedan', 'SUV', 'Truck', 'EV']
const carColors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Yellow', 'Green']

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
function wsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const base = `${protocol}//${window.location.host}/ws/telemetry`
  return withApiToken(base)
}

function parseTimestamp(dateStr: any): number | undefined {
  if (!dateStr) return undefined
  const time = new Date(dateStr).getTime()
  return isNaN(time) ? undefined : time
}

/**
 * Cập nhật trạng thái các slot dựa trên thông tin thời gian thực từ Spring Boot WebSocket
 */
export function applyRealtimeMessage(payload: any, slots: Ref<Slot[]>) {
  if (payload) {
    if (payload.frameId != null) {
      currentFrameId.value = payload.frameId
    } else if (payload.frame_id != null) {
      currentFrameId.value = payload.frame_id
    } else if (payload.slots && Array.isArray(payload.slots)) {
      let maxFrameId = 0
      for (const record of payload.slots) {
        if (record && record.frameId != null) {
          maxFrameId = Math.max(maxFrameId, record.frameId)
        } else if (record && record.frame_id != null) {
          maxFrameId = Math.max(maxFrameId, record.frame_id)
        }
      }
      if (maxFrameId > 0) {
        currentFrameId.value = maxFrameId
      }
    }

    if (payload.slots) {
      // Helper function to normalize ID by stripping leading zeros in column part
      const getNormId = (id: string): string => {
        if (!id) return ''
        const row = id.charAt(0)
        const colNum = parseInt(id.substring(1), 10)
        return isNaN(colNum) ? id : `${row}${colNum}`
      }

      // Tạo một Map từ payload.slots để tra cứu nhanh hơn, sử dụng normalized ID làm key
      const payloadSlotsMap = new Map<string, any>()
      for (const record of payload.slots) {
        if (record && record.id) {
          payloadSlotsMap.set(getNormId(record.id), record)
        }
      }

      // Duyệt qua tất cả các slot trên frontend
      for (const slot of slots.value) {
        const record = payloadSlotsMap.get(getNormId(slot.id))
        const wasOccupied = slot.occupied

        if (record) {
          // Convert từ occupied (1/0) của backend sang boolean (true/false) của frontend
          slot.occupied = record.occupied === 1

          // Parse startDate nếu có (là thời gian đỗ xe), fallback sang timestamp
          slot.timestamp = parseTimestamp(record.startDate) ?? parseTimestamp(record.timestamp)

          // Xử lý logic hiển thị mô hình xe 3D tương ứng
          if (!wasOccupied && slot.occupied) {
            slot.carType = slot.carType ?? randomChoice(carTypes)
            slot.carColor = slot.carColor ?? randomChoice(carColors)
          } else if (wasOccupied && !slot.occupied) {
            delete slot.carType
            delete slot.carColor
          }
        } else {
          // Những slot không có mặt trong danh sách từ Backend coi như occupied = 0 (trống)
          slot.occupied = false
          slot.timestamp = undefined
          delete slot.carType
          delete slot.carColor
        }
      }
    }
  }
}

export function useParkingRealtime() {
  function connect(slots: Ref<Slot[]>) {
    slotsRef = slots

    // Nếu đã kết nối hoặc đang kết nối thì không tạo thêm kết nối mới
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket đã hoặc đang trong trạng thái kết nối. Bỏ qua kết nối mới.')
      return
    }

    function startWebSocket() {
      if (socket) {
        try {
          socket.onclose = null
          socket.onerror = null
          socket.close()
        } catch (e) {
          console.error('Lỗi khi đóng socket cũ:', e)
        }
      }

      console.log('Đang kết nối đến native WebSocket: ws://localhost:8080/ws/parking')
      socket = new WebSocket('ws://localhost:8080/ws/parking')

      socket.onopen = () => {
        isConnected.value = true
        mqttConnected.value = true
        console.log('Đã kết nối thành công đến native WebSocket: ws://localhost:8080/ws/parking')
      }

      socket.onmessage = (event) => {
        console.log('Nhận message từ WebSocket:', event.data)
        try {
          const data = JSON.parse(event.data)
          if (slotsRef) {
            applyRealtimeMessage(data, slotsRef)
          }
        } catch (e) {
          console.error('Lỗi phân tích dữ liệu từ WebSocket:', e)
        }
      }

      socket.onclose = (event) => {
        isConnected.value = false
        mqttConnected.value = false
        console.log('Đã ngắt kết nối với native WebSocket. Code:', event.code, 'Reason:', event.reason)

        // Tự động kết nối lại sau 5 giây nếu connect() vẫn còn hiệu lực
        if (slotsRef) {
          if (reconnectTimer) window.clearTimeout(reconnectTimer)
          reconnectTimer = window.setTimeout(() => {
            if (slotsRef) {
              startWebSocket()
            }
          }, 5000)
        }
      }

      socket.onerror = (error) => {
        console.error('Lỗi WebSocket:', error)
      }
    }

    startWebSocket()
  }

  function disconnect() {
    if (socket) {
      try {
        socket.onclose = null
        socket.onerror = null
        socket.close()
      } catch (e) {
        console.error('Lỗi khi đóng socket trong disconnect:', e)
      }
      socket = null
    }
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }
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
