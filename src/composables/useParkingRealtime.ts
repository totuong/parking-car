import { ref, type Ref } from 'vue'
import type { Slot } from '../module/type'
import { withApiToken } from '../utils/api'
import { getCookie } from '../utils/cookie'

const isConnected = ref(false)
const mqttConnected = ref(false)
const currentFrameId = ref<number | null>(null)
const liveMode = ref(true)
const initialDataLoaded = ref(false)

let socket: WebSocket | null = null
let reconnectTimer: number | undefined
let healthTimer: number | undefined
let reconnectAttempt = 0
let slotsRef: Ref<Slot[]> | null = null

const carTypes = ['Sedan', 'SUV', 'Truck', 'EV']
const carColors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Yellow', 'Green']

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}
function wsUrl(): string {
  const protocol = 'ws:'
  const base = `${protocol}//localhost:8080/ws/parking`
  const token = getCookie('token')
  return token ? `${base}?token=${encodeURIComponent(token)}` : base
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
  if (!payload) return

  // 1. Phân tích để lấy danh sách records từ các định dạng khác nhau
  let records: any[] | undefined = undefined

  if (Array.isArray(payload)) {
    records = payload
  } else if (Array.isArray(payload.slots)) {
    records = payload.slots
  } else if (Array.isArray(payload.payload)) {
    records = payload.payload
  } else if (Array.isArray(payload.data)) {
    records = payload.data
  } else if (Array.isArray(payload.parkingSlots)) {
    records = payload.parkingSlots
  } else if (
    (payload.id != null || payload.slotId != null || payload.slot_id != null) &&
    (payload.occupied != null || payload.status != null || payload.isOccupied != null)
  ) {
    // Bản tin cập nhật đơn lẻ cho 1 slot
    records = [payload]
  }

  // Cập nhật frameId nếu có
  if (payload.frameId != null) {
    currentFrameId.value = payload.frameId
  } else if (payload.frame_id != null) {
    currentFrameId.value = payload.frame_id
  } else if (records) {
    let maxFrameId = 0
    for (const record of records) {
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

  if (records) {
    // Hàm chuẩn hóa slot ID (ví dụ: C01 -> C1, A01 -> A1)
    const getNormId = (id: any): string => {
      if (id == null) return ''
      const strId = String(id).trim()
      if (!strId) return ''
      const row = strId.charAt(0)
      const colNum = parseInt(strId.substring(1), 10)
      return isNaN(colNum) ? strId : `${row}${colNum}`
    }

    const payloadSlotsMap = new Map<string, any>()
    for (const record of records) {
      if (record) {
        const idVal = record.id ?? record.slotId ?? record.slot_id ?? record.code
        if (idVal != null) {
          payloadSlotsMap.set(getNormId(idVal), record)
        }
      }
    }

    // Nếu số lượng records truyền về lớn (ví dụ > 5), xem như bản tin snapshot đầy đủ
    // và sẽ reset trạng thái của những slot không xuất hiện trong bản tin.
    // Ngược lại, nếu là cập nhật đơn lẻ (incremental), chỉ cập nhật slot được truyền về.
    const isSnapshot = records.length > 5

    for (const slot of slots.value) {
      const normId = getNormId(slot.id)
      const hasRecord = payloadSlotsMap.has(normId)

      if (hasRecord) {
        const record = payloadSlotsMap.get(normId)
        const wasOccupied = slot.occupied

        // Phân tích trạng thái occupied từ nhiều trường có thể có
        const rawOccupied = record.occupied ?? record.isOccupied ?? record.status
        const isSlotOccupied = 
          rawOccupied === 1 || 
          rawOccupied === true || 
          rawOccupied === 'occupied' || 
          rawOccupied === 'busy' || 
          rawOccupied === 'OCCUPIED'

        slot.occupied = isSlotOccupied
        slot.timestamp = parseTimestamp(record.startDate) ?? parseTimestamp(record.timestamp)

        if (!wasOccupied && slot.occupied) {
          slot.carType = slot.carType ?? record.carType ?? randomChoice(carTypes)
          slot.carColor = slot.carColor ?? record.carColor ?? randomChoice(carColors)
        } else if (wasOccupied && !slot.occupied) {
          delete slot.carType
          delete slot.carColor
        }
      } else if (isSnapshot) {
        // Chỉ reset nếu đây là bản tin snapshot đầy đủ
        slot.occupied = false
        slot.timestamp = undefined
        delete slot.carType
        delete slot.carColor
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

      const url = wsUrl()
      console.log(`Đang kết nối đến native WebSocket: ${url}`)
      socket = new WebSocket(url)

      socket.onopen = () => {
        isConnected.value = true
        mqttConnected.value = true
        console.log(`Đã kết nối thành công đến native WebSocket: ${url}`)
      }

      socket.onmessage = (event) => {
        try {
          console.log('[WebSocket ws/parking] Tin nhắn thô nhận được:', event.data)
          const data = JSON.parse(event.data)
          console.log('[WebSocket ws/parking] Dữ liệu JSON đã phân tích:', data)
          if (slotsRef) {
            applyRealtimeMessage(data, slotsRef)
            initialDataLoaded.value = true
          }
        } catch (e) {
          console.error('[WebSocket ws/parking] Lỗi phân tích dữ liệu hoặc xử lý:', e)
        }
      }

      socket.onclose = (event) => {
        isConnected.value = false
        mqttConnected.value = false
        initialDataLoaded.value = false
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
    initialDataLoaded.value = false
    slotsRef = null
  }

  return {
    isConnected,
    mqttConnected,
    currentFrameId,
    initialDataLoaded,
    liveMode,
    connect,
    disconnect,
    applyRealtimeMessage,
  }
}
