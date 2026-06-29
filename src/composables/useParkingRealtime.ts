import { ref, type Ref } from 'vue'
import { Client } from '@stomp/stompjs'
import type { Slot } from '../module/type'
import type { BridgeHealth } from '../module/mqtt'

const isConnected = ref(false)
const mqttConnected = ref(false)
const currentFrameId = ref<number | null>(null)
const liveMode = ref(true)

let stompClient: Client | null = null
let slotsRef: Ref<Slot[]> | null = null
let healthTimer: number | undefined

/**
 * Cập nhật trạng thái các slot dựa trên thông tin thời gian thực từ Spring Boot WebSocket
 */
export function applyRealtimeMessage(payload: any, slots: Ref<Slot[]>) {
  if (payload) {
    if (payload.frameId != null) {
      currentFrameId.value = payload.frameId
    } else if (payload.frame_id != null) {
      currentFrameId.value = payload.frame_id
    }

    if (payload.slots) {
      for (const record of payload.slots) {
        // Tìm slot tương ứng trong state của Frontend dựa trên ID (Ví dụ: "A01", "D03")
        const slot = slots.value.find((s) => s.id === record.id)
        if (!slot) continue

        const wasOccupied = slot.occupied
        // Convert từ occupied (1/0) của backend sang boolean (true/false) của frontend
        slot.occupied = record.occupied === 1
        
        // Parse timestamp nếu có
        if (record.timestamp) {
          slot.timestamp = new Date(record.timestamp).getTime()
        }

        // Xử lý logic hiển thị mô hình xe 3D tương ứng
        if (!wasOccupied && slot.occupied) {
          slot.carType = slot.carType ?? 'Sedan'
          slot.carColor = slot.carColor ?? 'Silver'
        } else if (wasOccupied && !slot.occupied) {
          delete slot.carType
          delete slot.carColor
        }
      }
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
    // If health endpoint fails but stomp is connected, keep it active
    if (!stompClient || !stompClient.connected) {
      mqttConnected.value = false
    }
  }
}

export function useParkingRealtime() {
  function connect(slots: Ref<Slot[]>) {
    slotsRef = slots

    // Nếu đã kết nối rồi thì không tạo thêm kết nối mới
    if (stompClient && stompClient.connected) {
      return
    }

    stompClient = new Client({
      brokerURL: 'ws://localhost:8080/ws/websocket', // URL WebSocket của Spring Boot
      reconnectDelay: 5000, // Tự động kết nối lại sau 5 giây nếu đứt kết nối
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      onConnect: () => {
        isConnected.value = true
        mqttConnected.value = true
        console.log('Đã kết nối thành công đến Spring Boot STOMP Broker')
        
        // Đăng ký kênh nhận thông tin bãi đỗ xe thay đổi
        stompClient?.subscribe('/parking/dashboard', (message) => {
          try {
            const data = JSON.parse(message.body)
            if (slotsRef) {
              applyRealtimeMessage(data, slotsRef)
            }
          } catch (e) {
            console.error('Lỗi phân tích dữ liệu từ WebSocket:', e)
          }
        })
      },
      
      onDisconnect: () => {
        isConnected.value = false
        mqttConnected.value = false
        console.log('Đã ngắt kết nối với WebSocket Broker')
      },
      
      onStompError: (frame) => {
        console.error('Lỗi từ STOMP Broker:', frame.headers['message'])
        console.error('Chi tiết lỗi:', frame.body)
      }
    })

    stompClient.activate()

    if (healthTimer) window.clearInterval(healthTimer)
    pollHealth()
    healthTimer = window.setInterval(pollHealth, 5000)
  }

  function disconnect() {
    if (stompClient) {
      stompClient.deactivate()
      stompClient = null
    }
    if (healthTimer) {
      window.clearInterval(healthTimer)
      healthTimer = undefined
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
