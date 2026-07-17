<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch, inject } from 'vue'
import { Slot, LogEntry } from '../module/type'
import { 
  Car, Compass, Activity, Server, Play, Pause, RefreshCw,
  Video, Eye, TrendingUp, Clock, PieChart, Cpu, CheckCircle2, ChevronRight, Zap
} from 'lucide-vue-next'
import Chart from 'chart.js/auto'
import ThreeParkingLot from './ThreeParkingLot.vue'
import { useParkingRealtime } from '../composables/useParkingRealtime'
import { fetchParkingAnalytics, type ParkingAnalytics } from '../module/analytics'
import { withApiToken } from '../utils/api'

const isDark = inject<any>('isDark')
const locale = inject<any>('locale')
const t = inject<any>('t')

function translateLogMessage(msg: string): string {
  if (msg.includes("Smart parking digital twin engine initialized")) {
    return t('mile_d1')
  }
  if (msg.includes("Live CCTV camera feed online")) {
    return t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Camera CCTV live đã trực tuyến (Full HD).' : 'Live CCTV camera feed online (Full HD).'
  }
  if (msg.includes("All 4 CCTV camera feeds online")) {
    return t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Camera CCTV live đã trực tuyến (Full HD).' : 'Live CCTV camera feed online (Full HD).'
  }
  if (msg.includes("EV Fast Charger connected at Slot")) {
    const slotPart = msg.split("Slot ")[1] || ""
    return (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Đã kết nối sạc nhanh EV tại ô đỗ ' : 'EV Fast Charger connected at Slot ') + slotPart
  }
  if (msg.includes("Occupancy exceeded 50% threshold")) {
    return t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Tỷ lệ đỗ xe đã vượt ngưỡng 50%. Đang giám sát lưu lượng.' : 'Occupancy exceeded 50% threshold. Monitoring traffic.'
  }
  if (msg.includes("Vehicle Detected:")) {
    const colorAndType = msg.replace("Vehicle Detected: ", "").split(" parked successfully")[0] || ""
    const slotId = msg.split("Slot ")[1] || ""
    return (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Phát Hiện Xe: ' : 'Vehicle Detected: ') + colorAndType + (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? ' đỗ xe thành công tại ô ' : ' parked successfully in Slot ') + slotId
  }
  if (msg.includes("Vehicle Departed: Slot")) {
    const slotId = msg.split("Slot ")[1]?.split(" has been")[0] || ""
    const colorAndType = msg.split("(")[1]?.split(" exited")[0] || ""
    return (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Xe Rời Bãi: Ô đỗ ' : 'Vehicle Departed: Slot ') + slotId + (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? ' đã được giải phóng (' : ' has been vacated (') + colorAndType + (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? ' đi ra).' : ' exited).')
  }
  if (msg.includes("Simulation engine ACTIVATED")) {
    return t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Hệ thống mô phỏng dòng xe hoạt động.' : 'Simulation engine ACTIVATED.'
  }
  if (msg.includes("Simulation engine PAUSED")) {
    return t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Hệ thống mô phỏng dòng xe tạm dừng.' : 'Simulation engine PAUSED.'
  }
  if (msg.includes("Security Force Vacation: Manual slot override on Slot")) {
    const slotId = msg.split("Slot ")[1] || ""
    return (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Cưỡng Chế Giải Phóng: Ghi đè trạng thái tại ô ' : 'Security Force Vacation: Manual slot override on Slot ') + slotId
  }
  if (msg.includes("Security Force Booking: Manual slot override on Slot")) {
    const slotId = msg.split("Slot ")[1] || ""
    return (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Cưỡng Chế Đặt Chỗ: Ghi đè trạng thái tại ô ' : 'Security Force Booking: Manual slot override on Slot ') + slotId
  }
  if (msg.includes("Focused telemetry camera on Slot")) {
    const slotId = msg.split("Slot ")[1] || ""
    return (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Đã khóa camera đo lường vào ô ' : 'Focused telemetry camera on Slot ') + slotId
  }
  if (msg.includes("Main display switched to Live CCTV Channel")) {
    const chan = msg.split("Channel ")[1] || ""
    return (t('cctv_streaming') === 'LUỒNG HEVC (1 KÊNH)' ? 'Màn hình chính chuyển sang Live CCTV Kênh ' : 'Main display switched to Live CCTV Channel ') + chan
  }
  return msg
}

// 56 Parking Slots: Rows A, B, C, D, E with custom slot distributions
const slots = ref<Slot[]>([])

// Telemetry & KPI Stats
const totalDailyVehicles = ref(142)
const totalWeeklyVehicles = ref(986)
const activeCameras = ref(1)
const simulationActive = ref(false)

const { connect, disconnect, liveMode, initialDataLoaded } = useParkingRealtime()
// Bypass Vite buffering in dev: hit bridge MJPEG directly.
const mjpegUrl = withApiToken(
  import.meta.env.DEV ? 'http://127.0.0.1:8000/api/stream/mjpeg' : '/api/stream/mjpeg'
)

// Selected Slot for Telemetry details
const selectedSlot = ref<Slot | null>(null)
const hoveredSlot = ref<Slot | null>(null)

// CCTV state
const liveCameraKey = 'cctv_cam_a01'

// Charts Canvas refs
const trafficChartCanvas = ref<HTMLCanvasElement | null>(null)
const distributionChartCanvas = ref<HTMLCanvasElement | null>(null)
const peakHoursChartCanvas = ref<HTMLCanvasElement | null>(null)

let trafficChart: Chart | null = null
let distributionChart: Chart | null = null
let peakHoursChart: Chart | null = null
let analyticsTimer: number | undefined

const analyticsData = ref<ParkingAnalytics | null>(null)
const analyticsLoading = ref(false)

// Activity Feed Log entries
const logs = ref<LogEntry[]>([
  { id: '1', time: '19:00:05', type: 'system', message: 'Smart parking digital twin engine initialized successfully.' },
  { id: '2', time: '19:00:12', type: 'info', message: 'Live CCTV camera feed online (Full HD).' },
  { id: '3', time: '19:01:45', type: 'charge', message: 'EV Fast Charger connected at Slot C03.' },
  { id: '4', time: '19:02:10', type: 'alert', message: 'Occupancy exceeded 50% threshold. Monitoring traffic.' }
])

const logsContainerRef = ref<HTMLDivElement | null>(null)

// Simulation timers
let arrivalTimer: number | undefined
let departureTimer: number | undefined

// Vehicle helper assets
const carTypes = ['Sedan', 'SUV', 'Truck', 'EV']
const carColors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Yellow', 'Green']

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

// Get occupancy statistics — ưu tiên số liệu active từ PostgreSQL
const occupiedCount = computed(() => {
  const summary = analyticsData.value?.summary
  if (analyticsData.value?.available && summary) {
    return summary.occupied
  }
  return slots.value.filter((s) => s.occupied).length
})
const vacantCount = computed(() => {
  const summary = analyticsData.value?.summary
  if (analyticsData.value?.available && summary) {
    return Math.max(summary.tracked_slots - summary.occupied, 0)
  }
  return slots.value.filter((s) => !s.occupied).length
})
const occupancyRate = computed(() => {
  const summary = analyticsData.value?.summary
  if (analyticsData.value?.available && summary) {
    return Math.round(summary.occupancy_pct)
  }
  if (slots.value.length === 0) return 0
  return Math.round((occupiedCount.value / slots.value.length) * 100)
})

function normalizeSlotId(id: string): string {
  const match = /^([A-Za-z]+)0*(\d+)$/.exec(id.trim())
  if (!match) return id.trim().toUpperCase()
  return `${match[1]!.toUpperCase()}${match[2]}`
}

function applyActiveSlotsFromDb(activeSlots: Array<{ id: string; occupied: number }>) {
  const byId = new Map(activeSlots.map((row) => [normalizeSlotId(row.id), row.occupied === 1]))
  for (const slot of slots.value) {
    if (slot.noParking) continue
    const occupied = byId.get(normalizeSlotId(slot.id))
    if (occupied === undefined) continue
    if (slot.occupied === occupied) continue
    slot.occupied = occupied
    if (occupied) {
      slot.carColor = slot.carColor ?? randomChoice(carColors)
      slot.carType = slot.carType ?? randomChoice(carTypes)
      slot.timestamp = slot.timestamp ?? Date.now()
    } else {
      slot.carColor = undefined
      slot.carType = undefined
      slot.timestamp = undefined
    }
  }
}

// Initialize slots
function initSlots() {
  const s: Slot[] = []
  
  // Rows A and B: run from 0 to 13
  const rowsAB = ['A', 'B']
  for (const r of rowsAB) {
    for (let c = 0; c <= 13; c++) {
      const id = `${r}${c}`
      const isNoParking = (r === 'A' && c === 0) || (r === 'B' && c === 0)
      s.push({
        id,
        occupied: false,
        noParking: isNoParking
      })
    }
  }

  // Rows C, D, E: Columns 1 -> 14 (original layout)
  const rowsCDE = ['C', 'D', 'E']
  const noParkingSlotsCDE = new Set([
    'C13', 'C14',
    'D11', 'D12', 'D13', 'D14',
    'E11', 'E12', 'E13', 'E14'
  ])
  for (const r of rowsCDE) {
    for (let c = 1; c <= 14; c++) {
      const id = `${r}${c < 10 ? '0' + c : c}`
      s.push({
        id,
        occupied: false,
        noParking: noParkingSlotsCDE.has(id)
      })
    }
  }
  
  slots.value = s

  if (liveMode.value) return

  // Seed initial parking state (approx 45% full)
  const initialOccupancy = 25
  for (let i = 0; i < initialOccupancy; i++) {
    const vacantList = slots.value.filter(slot => !slot.occupied && !slot.noParking)
    if (vacantList.length === 0) break
    const targetSlot = randomChoice(vacantList)
    
    targetSlot.occupied = true
    targetSlot.carColor = randomChoice(carColors)
    targetSlot.carType = randomChoice(carTypes)
    targetSlot.timestamp = Date.now() - (Math.random() * 4 * 60 * 60 * 1000) // parked 0 to 4 hours ago
  }

  initialDataLoaded.value = true
}

// Add a live log entry
function addLog(type: LogEntry['type'], message: string) {
  const now = new Date()
  const timeStr = now.toTimeString().split(' ')[0]!
  logs.value.push({
    id: String(Date.now() + Math.random()),
    time: timeStr,
    type,
    message
  })
  
  // Keep logs under 50
  if (logs.value.length > 50) {
    logs.value.shift()
  }

  // Scroll to bottom dynamically
  nextTick(() => {
    if (logsContainerRef.value) {
      logsContainerRef.value.scrollTop = logsContainerRef.value.scrollHeight
    }
  })
}

// Simulation vehicle arrival
function simulateArrival() {
  if (!simulationActive.value || liveMode.value) return

  const vacantList = slots.value.filter(s => !s.occupied && !s.noParking)
  if (vacantList.length > 0) {
    const slot = randomChoice(vacantList)
    const color = randomChoice(carColors)
    const type = randomChoice(carTypes)
    
    slot.occupied = true
    slot.carColor = color
    slot.carType = type
    slot.timestamp = Date.now()
    
    totalDailyVehicles.value++
    totalWeeklyVehicles.value++
    
    const isEV = type === 'EV'
    addLog(
      isEV ? 'charge' : 'info', 
      `Vehicle Detected: ${color} ${type} parked successfully in Slot ${slot.id}.`
    )

    // Trigger chart update in simulation mode only
    if (!analyticsData.value?.available) {
      updateChartsTelemetry()
    }
  }

  // Schedule next arrival (slowed down from 8-16s to 24-48s for high fidelity realistic pace)
  const nextDelay = 24000 + Math.random() * 24000
  arrivalTimer = window.setTimeout(simulateArrival, nextDelay)
}

// Simulation vehicle departure
function simulateDeparture() {
  if (!simulationActive.value || liveMode.value) return

  const occupiedList = slots.value.filter(s => s.occupied)
  if (occupiedList.length > 5) { // Maintain at least 5 parked cars
    const slot = randomChoice(occupiedList)
    
    // Log departure
    addLog('info', `Vehicle Departed: Slot ${slot.id} has been vacated (${slot.carColor} ${slot.carType} exited).`)
    
    slot.occupied = false
    slot.carColor = undefined
    slot.carType = undefined
    slot.timestamp = undefined

    // If selected slot is the one leaving, update inspect panel
    if (selectedSlot.value && selectedSlot.value.id === slot.id) {
      selectedSlot.value = { ...slot }
    }

    // Trigger chart update in simulation mode only
    if (!analyticsData.value?.available) {
      updateChartsTelemetry()
    }
  }

  // Schedule next departure (slowed down from 10-20s to 28-56s for high fidelity realistic pace)
  const nextDelay = 28000 + Math.random() * 28000
  departureTimer = window.setTimeout(simulateDeparture, nextDelay)
}

// Toggles simulation running state
function toggleSimulation() {
  if (liveMode.value) return
  simulationActive.value = !simulationActive.value
  addLog('system', `Simulation engine ${simulationActive.value ? 'ACTIVATED' : 'PAUSED'}.`)
  
  if (simulationActive.value) {
    simulateArrival()
    simulateDeparture()
  } else {
    if (arrivalTimer) clearTimeout(arrivalTimer)
    if (departureTimer) clearTimeout(departureTimer)
  }
}

// Manual override occupancy status
function manualToggleSlot(slotId: string) {
  const slot = slots.value.find(s => s.id === slotId)
  if (!slot) return

  if (slot.noParking) {
    addLog('security', `Security Guard: Refused vehicle override. Slot ${slot.id} is a strictly enforced No-Parking Zone.`)
    return
  }

  if (slot.occupied) {
    addLog('security', `Security Force Vacation: Manual slot override on Slot ${slot.id}.`)
    slot.occupied = false
    slot.carColor = undefined
    slot.carType = undefined
    slot.timestamp = undefined
  } else {
    const color = randomChoice(carColors)
    const type = randomChoice(carTypes)
    addLog('security', `Security Force Booking: Manual slot override on Slot ${slot.id} (${color} ${type}).`)
    slot.occupied = true
    slot.carColor = color
    slot.carType = type
    slot.timestamp = Date.now()
  }

  // Update selection panel
  if (selectedSlot.value?.id === slotId) {
    selectedSlot.value = { ...slot }
  }
  
  if (!analyticsData.value?.available) {
    updateChartsTelemetry()
  }
}

// Click Slot selection
function handleSelectSlot(slot: Slot | null) {
  selectedSlot.value = slot
  if (slot) {
    addLog('system', `Focused telemetry camera on Slot ${slot.id}.`)
  }
}

function handleHoverSlot(slot: Slot | null) {
  hoveredSlot.value = slot
}

async function loadAnalytics() {
  analyticsLoading.value = true
  try {
    analyticsData.value = await fetchParkingAnalytics()
    if (analyticsData.value.available && analyticsData.value.active_slots) {
      applyActiveSlotsFromDb(analyticsData.value.active_slots)
      initialDataLoaded.value = true
    }
    if (trafficChart || distributionChart || peakHoursChart) {
      applyAnalyticsToCharts()
    }
  } catch {
    analyticsData.value = { available: false }
  } finally {
    analyticsLoading.value = false
  }
}

function zoneColors() {
  return ['#06b6d4', '#6366f1', '#a855f7', '#f97316', '#10b981']
}

function applyAnalyticsToCharts() {
  const data = analyticsData.value
  if (!data?.available) return

  if (trafficChart && data.traffic_by_minute) {
    trafficChart.data.labels = data.traffic_by_minute.labels
    trafficChart.data.datasets = [
      {
        label: t('chart_entries'),
        data: data.traffic_by_minute.entries,
        borderColor: '#06b6d4',
        borderWidth: 2,
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#06b6d4',
        pointHoverRadius: 5,
      },
      {
        label: t('chart_exits'),
        data: data.traffic_by_minute.exits,
        borderColor: '#f97316',
        borderWidth: 2,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#f97316',
        pointHoverRadius: 5,
      },
    ]
    trafficChart.options.plugins = {
      legend: {
        display: true,
        labels: { color: isDark.value ? '#e2e8f0' : '#1e293b', font: { size: 10 }, boxWidth: 10 },
      },
    }
    trafficChart.update()
  }

  if (distributionChart && data.occupancy_by_zone) {
    distributionChart.data.labels = data.occupancy_by_zone.labels.map(
      (zone) => `${locale.value === 'vi' ? 'Khu' : 'Zone'} ${zone}`
    )
    distributionChart.data.datasets[0]!.data = data.occupancy_by_zone.occupied
    distributionChart.data.datasets[0]!.backgroundColor = zoneColors().slice(0, data.occupancy_by_zone.labels.length)
    distributionChart.update()
  }

  if (peakHoursChart && data.slot_turnover) {
    peakHoursChart.data.labels = data.slot_turnover.labels
    peakHoursChart.data.datasets[0]!.data = data.slot_turnover.changes
    peakHoursChart.update()
  }
}

// Render dynamic dashboard analytics charts
function initCharts() {
  const textColor = isDark.value ? '#94a3b8' : '#475569'
  const gridColor = isDark.value ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'
  const legendColor = isDark.value ? '#e2e8f0' : '#1e293b'

  const traffic = analyticsData.value?.traffic_by_minute
  const zones = analyticsData.value?.occupancy_by_zone
  const turnover = analyticsData.value?.slot_turnover

  if (trafficChartCanvas.value) {
    const ctx = trafficChartCanvas.value.getContext('2d')
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 200)
      gradient.addColorStop(0, isDark.value ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.25)')
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)')

      trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: traffic?.labels ?? [],
          datasets: traffic
            ? [
                {
                  label: t('chart_entries'),
                  data: traffic.entries,
                  borderColor: '#06b6d4',
                  borderWidth: 2,
                  backgroundColor: gradient,
                  fill: true,
                  tension: 0.35,
                  pointBackgroundColor: '#06b6d4',
                  pointHoverRadius: 5,
                },
                {
                  label: t('chart_exits'),
                  data: traffic.exits,
                  borderColor: '#f97316',
                  borderWidth: 2,
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  fill: true,
                  tension: 0.35,
                  pointBackgroundColor: '#f97316',
                  pointHoverRadius: 5,
                },
              ]
            : [{
                label: t('chart_entries'),
                data: [],
                borderColor: '#06b6d4',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.35,
              }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: Boolean(traffic),
              labels: { color: legendColor, font: { size: 10 }, boxWidth: 10 },
            },
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } }, beginAtZero: true },
          },
        },
      })
    }
  }

  if (distributionChartCanvas.value) {
    const ctx = distributionChartCanvas.value.getContext('2d')
    if (ctx) {
      distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: zones?.labels.map((zone) => `${locale.value === 'vi' ? 'Khu' : 'Zone'} ${zone}`) ?? [],
          datasets: [{
            label: t('chart_occupied'),
            data: zones?.occupied ?? [],
            backgroundColor: zoneColors().slice(0, zones?.labels.length ?? 5),
            borderWidth: 0,
            hoverOffset: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: legendColor, font: { size: 10 }, boxWidth: 10 },
            },
          },
          cutout: '70%',
        },
      })
    }
  }

  if (peakHoursChartCanvas.value) {
    const ctx = peakHoursChartCanvas.value.getContext('2d')
    if (ctx) {
      peakHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: turnover?.labels ?? [],
          datasets: [{
            label: t('chart_changes'),
            data: turnover?.changes ?? [],
            backgroundColor: 'rgba(99, 102, 241, 0.85)',
            hoverBackgroundColor: '#6366f1',
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } }, beginAtZero: true },
          },
        },
      })
    }
  }
}

function updateChartsTelemetry() {
  if (analyticsData.value?.available) return
  if (!distributionChart) return

  const typeCounts = { Sedan: 0, SUV: 0, Truck: 0, EV: 0 }
  slots.value.forEach(s => {
    if (s.occupied && s.carType) {
      const type = s.carType as keyof typeof typeCounts
      if (typeCounts[type] !== undefined) {
        typeCounts[type]++
      }
    }
  })

  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0)
  if (total > 0) {
    distributionChart.data.labels = ['Sedan', 'SUV', 'Truck', 'EV']
    distributionChart.data.datasets[0]!.data = [
      typeCounts.Sedan,
      typeCounts.SUV,
      typeCounts.Truck,
      typeCounts.EV,
    ]
    distributionChart.update()
  }
}

// Watch theme and language changes to recreate charts
watch([isDark, locale], () => {
  if (trafficChart) trafficChart.destroy()
  if (distributionChart) distributionChart.destroy()
  if (peakHoursChart) peakHoursChart.destroy()
  nextTick(() => {
    initCharts()
    applyAnalyticsToCharts()
    if (!analyticsData.value?.available) {
      updateChartsTelemetry()
    }
  })
})

onMounted(() => {
  initSlots()
  connect(slots)

  setTimeout(async () => {
    await loadAnalytics()
    initCharts()
    applyAnalyticsToCharts()
    if (!analyticsData.value?.available) {
      updateChartsTelemetry()
    }
  }, 300)

  analyticsTimer = window.setInterval(loadAnalytics, 60000)

  if (!liveMode.value && simulationActive.value) {
    simulateArrival()
    simulateDeparture()
  }
})

onBeforeUnmount(() => {
  disconnect()
  if (arrivalTimer) clearTimeout(arrivalTimer)
  if (departureTimer) clearTimeout(departureTimer)
  if (analyticsTimer) clearInterval(analyticsTimer)
  if (trafficChart) trafficChart.destroy()
  if (distributionChart) distributionChart.destroy()
  if (peakHoursChart) peakHoursChart.destroy()
})
</script>

<template>
  <div class="flex flex-col gap-6 font-sans transition-colors duration-300" :class="isDark ? 'text-slate-100' : 'text-slate-800'">
    
    <!-- SECTION A: KPI Stat Cards -->
    <section id="section-overview" class="section-anchor scroll-mt-6 rounded-2xl transition-shadow duration-300">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      
      <!-- Total Slots -->
      <div 
        class="relative overflow-hidden rounded-xl border p-5 backdrop-blur-md shadow-lg group transition duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60 hover:border-cyan-500/30' 
          : 'border-slate-200 bg-white/70 hover:border-cyan-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('total_slots') }}</p>
            <h3 class="text-2xl font-black font-mono mt-1" :class="isDark ? 'text-slate-100' : 'text-slate-800'">{{ slots.length }}</h3>
          </div>
          <div 
            class="p-3 rounded-lg group-hover:scale-110 transition duration-300"
            :class="isDark 
              ? 'bg-cyan-950/50 border border-cyan-500/20 text-cyan-400' 
              : 'bg-cyan-50 border border-cyan-200 text-cyan-600'"
          >
            <Compass class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase" :class="isDark ? 'text-slate-500' : 'text-slate-400'">
          <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 inline animate-pulse" /> {{ t('dual_deck') }}
        </div>
        <!-- Pulse effect line -->
        <span class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></span>
      </div>

      <!-- Occupied Slots -->
      <div 
        class="relative overflow-hidden rounded-xl border p-5 backdrop-blur-md shadow-lg group transition duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60 hover:border-orange-500/30' 
          : 'border-slate-200 bg-white/70 hover:border-orange-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('occupied_slots') }}</p>
            <h3 class="text-2xl font-black font-mono text-orange-500 mt-1 animate-pulse">{{ occupiedCount }}</h3>
          </div>
          <div 
            class="p-3 rounded-lg group-hover:scale-110 transition duration-300"
            :class="isDark 
              ? 'bg-orange-950/50 border border-orange-500/20 text-orange-400' 
              : 'bg-orange-50 border border-orange-200 text-orange-600'"
          >
            <Car class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[10px]">
          <span class="w-2 h-2 rounded-full bg-orange-500 inline-block animate-ping"></span>
          <span class="font-semibold uppercase" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('realtime_synced') }}</span>
        </div>
        <span class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></span>
      </div>

      <!-- Occupancy Rate -->
      <div 
        class="relative overflow-hidden rounded-xl border p-5 backdrop-blur-md shadow-lg group transition duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60 hover:border-indigo-500/30' 
          : 'border-slate-200 bg-white/70 hover:border-indigo-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('occupancy_rate') }}</p>
            <h3 class="text-2xl font-black font-mono text-indigo-500 mt-1">{{ occupancyRate }}%</h3>
          </div>
          <div 
            class="p-3 rounded-lg group-hover:scale-110 transition duration-300"
            :class="isDark 
              ? 'bg-indigo-950/50 border border-indigo-500/20 text-indigo-400' 
              : 'bg-indigo-50 border-indigo-200 text-indigo-600'"
          >
            <Activity class="w-5 h-5" />
          </div>
        </div>
        <!-- Simple progress bar -->
        <div class="mt-4.5 w-full rounded-full h-1.5 overflow-hidden" :class="isDark ? 'bg-slate-900' : 'bg-slate-100'">
          <div class="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500" :style="{ width: `${occupancyRate}%` }"></div>
        </div>
        <span class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></span>
      </div>
      
    </div>
    </section>

    <!-- MAIN DISPLAY: 3D Twin & Inspect Panel -->
    <section id="section-twin" class="section-anchor scroll-mt-6 rounded-2xl transition-shadow duration-300">
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      <!-- 3D Map (Span 3 on large screens) -->
      <div class="xl:col-span-3 flex flex-col gap-4">
        <div class="flex items-center justify-between border-b pb-3" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
          <div>
            <h2 
              class="text-lg font-black tracking-wider uppercase flex items-center gap-2 transition-colors duration-300"
              :class="isDark ? 'text-cyan-400' : 'text-cyan-600'"
            >
              <Cpu class="w-5 h-5 animate-pulse" /> {{ t('twin_map_title') }}
            </h2>
            <p class="text-xs" :class="isDark ? 'text-slate-500' : 'text-slate-500'">{{ t('twin_map_desc') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Simulation Status indicator -->
            <div 
              class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] uppercase font-bold transition-all duration-300"
              :class="isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'"
            >
              <span class="w-2 h-2 rounded-full inline-block" :class="simulationActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'"></span>
              {{ simulationActive ? t('sim_active') : t('sim_paused') }}
            </div>
            <button 
              @click="toggleSimulation" 
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold select-none cursor-pointer transition active:scale-95 shadow-sm"
              :class="simulationActive 
                ? (isDark ? 'bg-red-950/20 border-red-500/30 text-red-400 hover:bg-red-900/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100') 
                : (isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/20' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100')"
            >
              <component :is="simulationActive ? Pause : Play" class="w-3.5 h-3.5" /> 
              {{ simulationActive ? t('pause_sim') : t('resume_sim') }}
            </button>
          </div>
        </div>

        <!-- Mount the Three.js Interactive Parking Lot -->
        <ThreeParkingLot 
          :slots="slots" 
          :is-data-loaded="initialDataLoaded"
          @select-slot="handleSelectSlot"
          @hover-slot="handleHoverSlot"
        />
      </div>

      <!-- Holographic Interactive Telemetry Inspector Panel -->
      <div class="flex flex-col gap-4">
        <div class="border-b pb-3" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
          <h2 
            class="text-lg font-black tracking-wider uppercase flex items-center gap-2 transition-colors duration-300"
            :class="isDark ? 'text-cyan-400' : 'text-cyan-600'"
          >
            <Activity class="w-5 h-5" /> {{ t('slot_telemetry') }}
          </h2>
          <p class="text-xs" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('slot_telemetry_desc') }}</p>
        </div>

        <!-- Telemetry Panel Body -->
        <div 
          class="flex-1 rounded-xl border p-5 backdrop-blur-md shadow-lg flex flex-col justify-between min-h-[380px] transition-all duration-300"
          :class="isDark 
            ? 'border-slate-800 bg-slate-950/60 text-slate-100' 
            : 'border-slate-200 bg-white/70 text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'"
        >
          
          <template v-if="selectedSlot">
            <div>
              <div class="flex items-center justify-between border-b pb-3" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
                <span class="text-sm font-black" :class="isDark ? 'text-cyan-400' : 'text-cyan-600'">SLOT {{ selectedSlot.id }}</span>
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-black uppercase border transition-colors duration-300"
                  :class="selectedSlot.occupied ? 'bg-orange-950 border-orange-500/30 text-orange-400' : (selectedSlot.noParking ? 'bg-red-950 border-red-500/30 text-red-400' : 'bg-emerald-950 border-emerald-500/30 text-emerald-400')"
                >
                  {{ selectedSlot.occupied ? t('occupied') : (selectedSlot.noParking ? (locale === 'vi' ? 'CẤM ĐỖ' : 'NO PARKING') : t('vacant')) }}
                </span>
              </div>

              <!-- Occupied Status details -->
              <div v-if="selectedSlot.occupied" class="flex flex-col gap-3 mt-4">
                <div 
                  class="rounded-lg p-3 border flex items-center gap-3 transition-colors duration-300"
                  :class="isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-150'"
                >
                  <Car class="w-8 h-8" :class="isDark ? 'text-cyan-400' : 'text-cyan-600'" />
                  <div>
                    <h4 class="text-xs font-bold uppercase" :class="isDark ? 'text-slate-400' : 'text-slate-500'">{{ t('vehicle_telemetry') }}</h4>
                    <p class="text-sm font-black mt-0.5" :class="isDark ? 'text-white' : 'text-slate-800'">{{ selectedSlot.carColor }} {{ selectedSlot.carType }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 font-mono text-[10px]">
                  <div 
                    class="p-2.5 rounded border transition-colors duration-300"
                    :class="isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-slate-50/50 border-slate-150 text-slate-600'"
                  >
                    <span class="text-slate-500 block uppercase mb-1">{{ t('parked_at') }}</span>
                    <span class="font-bold" :class="isDark ? 'text-slate-300' : 'text-slate-700'">
                      {{ selectedSlot.timestamp ? new Date(selectedSlot.timestamp).toLocaleTimeString() : '—' }}
                    </span>
                  </div>
                  <div 
                    class="p-2.5 rounded border transition-colors duration-300"
                    :class="isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-slate-50/50 border-slate-150 text-slate-600'"
                  >
                    <span class="text-slate-500 block uppercase mb-1">{{ t('duration') }}</span>
                    <span class="font-bold text-cyan-600">
                      {{ selectedSlot.timestamp ? Math.round((Date.now() - selectedSlot.timestamp) / 60000) : 0 }} {{ locale === 'vi' ? 'phút' : 'mins' }}
                    </span>
                  </div>
                </div>

                <!-- EV fast charging overlay if EV -->
                <div 
                  v-if="selectedSlot.carType === 'EV'" 
                  class="border rounded-lg p-3 flex flex-col gap-2 mt-2 transition-all duration-300"
                  :class="isDark 
                    ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' 
                    : 'bg-emerald-50/50 border-emerald-200 text-emerald-600'"
                >
                  <div class="flex items-center justify-between text-xs font-extrabold uppercase">
                    <span class="flex items-center gap-1"><Zap class="w-3.5 h-3.5 fill-emerald-500" :class="isDark ? 'fill-emerald-400' : 'fill-emerald-500'" /> {{ t('charging') }}</span>
                    <span>84%</span>
                  </div>
                  <div class="w-full h-1.5 rounded-full overflow-hidden" :class="isDark ? 'bg-slate-900' : 'bg-slate-200'">
                    <div class="bg-emerald-500 h-full w-[84%] rounded-full animate-pulse"></div>
                  </div>
                  <span class="text-[9px] text-slate-550 text-slate-500">{{ t('charger_desc') }}</span>
                </div>
              </div>

              <!-- No Parking Status details -->
              <div v-else-if="selectedSlot.noParking" class="flex flex-col items-center justify-center py-12 text-red-500">
                <div class="text-4xl font-extrabold text-red-500 border-4 border-red-500 rounded-full w-16 h-16 flex items-center justify-center animate-pulse">X</div>
                <p class="text-xs font-bold uppercase tracking-wider mt-4">{{ locale === 'vi' ? 'KHU VỰC CẤM ĐỖ' : 'NO PARKING ZONE' }}</p>
                <p class="text-[10px] text-slate-500 text-center mt-1.5 px-4 leading-relaxed">
                  {{ locale === 'vi' ? 'Đây là ô đỗ xe đặc biệt được dành riêng hoặc cấm đỗ. Vui lòng di chuyển sang ô khác.' : 'This slot is designated as a no-parking zone. Please select a valid slot.' }}
                </p>
              </div>

              <!-- Vacant Status details -->
              <div v-else class="flex flex-col items-center justify-center py-12 text-slate-500">
                <Compass class="w-12 h-12 text-slate-700 animate-spin" style="animation-duration: 20s" />
                <p class="text-xs font-bold uppercase tracking-wider mt-4" :class="isDark ? 'text-slate-400' : 'text-slate-650 text-slate-600'">{{ t('space_empty') }}</p>
                <p class="text-[10px] text-slate-500 text-center mt-1">{{ t('space_empty_desc') }}</p>
              </div>
            </div>

            <!-- Manual override action buttons -->
            <div class="border-t pt-4 flex flex-col gap-2 mt-6" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
              <button 
                @click="manualToggleSlot(selectedSlot.id)"
                :disabled="selectedSlot.noParking"
                class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer select-none transition border active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                :class="isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300' 
                  : 'bg-slate-100 hover:bg-slate-250 border-slate-200 text-slate-750 text-slate-700'"
              >
                <RefreshCw class="w-3.5 h-3.5 text-cyan-600" /> {{ t('force_toggle') }}
              </button>
              <button 
                @click="selectedSlot = null"
                class="w-full px-3 py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider text-center select-none cursor-pointer"
                :class="isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'"
              >
                {{ t('deselect_telemetry') }}
              </button>
            </div>

          </template>
          <template v-else>
            <!-- No select placeholder -->
            <div class="flex-1 flex flex-col items-center justify-center py-8 text-center select-none">
              <div 
                class="relative w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 shadow-inner transition-colors duration-300"
                :class="isDark ? 'bg-slate-900/85 border-slate-800 text-slate-600' : 'bg-slate-100 border-slate-150 text-slate-400'"
              >
                <Server class="w-7 h-7 animate-pulse text-cyan-600/60" />
              </div>
              <p class="text-xs font-black uppercase tracking-wider" :class="isDark ? 'text-slate-400' : 'text-slate-750 text-slate-700'">{{ t('no_telemetry_connected') }}</p>
              <p class="text-[10px] text-slate-550 text-slate-500 max-w-[180px] mt-1.5 leading-relaxed font-sans">
                {{ t('no_telemetry_desc') }}
              </p>
            </div>
          </template>

        </div>
      </div>
    </div>
    </section>

    <!-- SECTION B: CCTV Feed -->
    <section id="section-cctv" class="section-anchor scroll-mt-6 rounded-2xl transition-shadow duration-300 flex flex-col gap-4">
        <div class="border-b pb-3 flex justify-between items-center" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
          <div>
            <h2 
              class="text-lg font-black tracking-wider uppercase flex items-center gap-2 transition-colors duration-300"
              :class="isDark ? 'text-cyan-400' : 'text-cyan-600'"
            >
              <Video class="w-5 h-5" /> {{ t('cctv_title') }}
            </h2>
            <p class="text-xs text-slate-500">{{ t('cctv_desc') }}</p>
          </div>
          <span 
            class="text-[10px] font-mono font-black border px-2 py-0.5 rounded uppercase transition-colors duration-300"
            :class="isDark 
              ? 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20' 
              : 'text-cyan-600 bg-cyan-50 border-cyan-200'"
          >
            {{ t('cctv_streaming') }}
          </span>
        </div>

        <div
          class="relative overflow-hidden rounded-xl border shadow-lg transition duration-300 w-full aspect-video min-h-[360px] max-h-[80vh]"
          :class="isDark 
            ? 'border-slate-800 bg-black' 
            : 'border-slate-200 bg-slate-900'"
        >
          <!-- Camera Name Tag overlay -->
          <div 
            class="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold transition-all duration-300"
            :class="isDark 
              ? 'bg-slate-950/80 border-slate-850 text-slate-300' 
              : 'bg-slate-50/90 border-slate-200 text-slate-700'"
          >
            <Eye class="w-3 h-3 text-cyan-500" /> {{ t(liveCameraKey) }}
          </div>

          <!-- Blink REC overlay -->
          <div 
            class="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold transition-all duration-300"
            :class="isDark 
              ? 'bg-slate-950/80 border-slate-850' 
              : 'bg-slate-50/90 border-slate-200'"
          >
            <span class="relative flex h-1.5 w-1.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
            <span class="text-red-500 font-extrabold uppercase">{{ t('cctv_rec') }}</span>
          </div>

          <!-- Static noise/CCTV effect overlay -->
          <div class="absolute inset-0 bg-cctv-scanlines z-10 pointer-events-none opacity-10"></div>

          <!-- Dynamic Clock -->
          <div class="absolute bottom-3 left-3 z-20 font-mono text-[8px] text-slate-400 tracking-wider">
            2026-05-24 T{{ new Date().toTimeString().split(' ')[0] }}
          </div>

          <!-- Live MJPEG Feed -->
          <div class="w-full h-full relative flex items-center justify-center">
            <img
              v-if="liveMode"
              :src="mjpegUrl"
              class="w-full h-full object-contain z-0"
              alt="Live CCTV"
            />
            <div
              v-else
              class="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest font-mono text-slate-500"
            >
              {{ t('cctv_live') }} 01
            </div>
            <span class="absolute w-full h-[1px] bg-cyan-500/10 top-0 left-0 animate-scanline pointer-events-none"></span>
          </div>
        </div>
    </section>

    <!-- SECTION C: Parking Analytics Charts -->
    <section id="section-analytics" class="section-anchor scroll-mt-6 rounded-2xl transition-shadow duration-300">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Traffic line chart -->
      <div 
        class="rounded-xl border p-5 backdrop-blur-md shadow-lg flex flex-col gap-4 transition-all duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60' 
          : 'border-slate-200 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'"
      >
        <h3 
          class="text-xs font-black tracking-widest uppercase flex items-center gap-1.5 pb-2 transition-all duration-300"
          :class="isDark ? 'text-cyan-400 border-b border-slate-900' : 'text-cyan-600 border-b border-slate-100'"
        >
          <TrendingUp class="w-4.5 h-4.5" /> {{ t('chart_traffic') }}
        </h3>
        <div class="relative h-[200px] w-full">
          <canvas ref="trafficChartCanvas"></canvas>
        </div>
      </div>

      <!-- Vehicle types breakdown doughnut chart -->
      <div 
        class="rounded-xl border p-5 backdrop-blur-md shadow-lg flex flex-col gap-4 transition-all duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60' 
          : 'border-slate-200 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'"
      >
        <h3 
          class="text-xs font-black tracking-widest uppercase flex items-center gap-1.5 pb-2 transition-all duration-300"
          :class="isDark ? 'text-cyan-400 border-b border-slate-900' : 'text-cyan-600 border-b border-slate-100'"
        >
          <PieChart class="w-4.5 h-4.5" /> {{ t('chart_distribution') }}
        </h3>
        <div class="relative h-[200px] w-full flex items-center justify-center">
          <canvas ref="distributionChartCanvas"></canvas>
        </div>
      </div>

      <!-- Peak parking hours bar chart -->
      <div 
        class="rounded-xl border p-5 backdrop-blur-md shadow-lg flex flex-col gap-4 transition-all duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60' 
          : 'border-slate-200 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'"
      >
        <h3 
          class="text-xs font-black tracking-widest uppercase flex items-center gap-1.5 pb-2 transition-all duration-300"
          :class="isDark ? 'text-cyan-400 border-b border-slate-900' : 'text-cyan-600 border-b border-slate-100'"
        >
          <Clock class="w-4.5 h-4.5" /> {{ t('chart_peak') }}
        </h3>
        <div class="relative h-[200px] w-full">
          <canvas ref="peakHoursChartCanvas"></canvas>
        </div>
      </div>

    </div>
    </section>

    <!-- Nhật ký hoạt động -->
    <section id="section-activity" class="section-anchor scroll-mt-6 rounded-2xl transition-shadow duration-300 flex flex-col gap-4">
      <div class="border-b pb-3 flex items-center justify-between" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
        <h2 
          class="text-lg font-black tracking-wider uppercase flex items-center gap-2 transition-colors duration-300"
          :class="isDark ? 'text-cyan-400' : 'text-cyan-600'"
        >
          <Activity class="w-5 h-5" /> {{ t('activity_log') }}
        </h2>
        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{{ t('live_feeds') }}</span>
      </div>

      <div 
        class="rounded-xl border p-4 backdrop-blur-md shadow-lg flex flex-col min-h-[300px] transition-all duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60' 
          : 'border-slate-200 bg-white/70 text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'"
      >
        <div 
          ref="logsContainerRef"
          class="flex-1 overflow-y-auto max-h-[320px] flex flex-col gap-2.5 scrollbar-thin scrollbar-track-transparent pr-1"
          :class="isDark ? 'scrollbar-thumb-slate-800' : 'scrollbar-thumb-slate-200'"
        >
          <div 
            v-for="log in logs" 
            :key="log.id"
            class="flex items-start gap-2.5 text-[10px] pb-2 last:border-0"
            :class="isDark ? 'border-b border-slate-900/60' : 'border-b border-slate-100'"
          >
            <span class="font-mono text-slate-500 font-bold mt-0.5">{{ log.time }}</span>
            <span 
              class="px-1.5 py-0.2 rounded font-black tracking-widest uppercase text-[8px] shrink-0 mt-0.5 border"
              :class="{
                'bg-cyan-950/50 border-cyan-500/20 text-cyan-500': log.type === 'info',
                'bg-orange-950/50 border-orange-500/20 text-orange-500': log.type === 'alert',
                'bg-emerald-950/50 border-emerald-500/20 text-emerald-500': log.type === 'charge',
                'bg-red-950/50 border-red-500/20 text-red-500': log.type === 'security',
                'bg-indigo-950/50 border-indigo-500/20 text-indigo-500': log.type === 'system'
              }"
            >
              {{ log.type }}
            </span>
            <span class="leading-relaxed transition-colors duration-300" :class="isDark ? 'text-slate-300' : 'text-slate-600'">{{ translateLogMessage(log.message) }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* Custom styled filters for the high-tech Dashboard layout */
.bg-cctv-scanlines {
  background: linear-gradient(
    rgba(18, 16, 16, 0) 50%, 
    rgba(0, 0, 0, 0.25) 50%
  ), linear-gradient(
    90deg, 
    rgba(255, 0, 0, 0.06), 
    rgba(0, 255, 0, 0.02), 
    rgba(0, 0, 255, 0.06)
  );
  background-size: 100% 4px, 6px 100%;
}

@keyframes scanline {
  0% {
    top: 0%;
  }
  100% {
    top: 100%;
  }
}

.animate-scanline {
  animation: scanline 4s linear infinite;
}

/* Scrollbars custom styling */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #0ea5e9;
}
</style>
