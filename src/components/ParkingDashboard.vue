<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from 'vue'
import { 
  Car, Compass, Activity, Server, AlertTriangle, Play, Pause, RefreshCw, 
  Video, Eye, TrendingUp, Clock, PieChart, ShieldAlert, Cpu, CheckCircle2, ChevronRight, Zap
} from 'lucide-vue-next'
import Chart from 'chart.js/auto'
import ThreeParkingLot from './ThreeParkingLot.vue'

type Slot = {
  id: string
  occupied: boolean
  carType?: string
  carColor?: string
  timestamp?: number
}

type LogEntry = {
  id: string
  time: string
  type: 'info' | 'alert' | 'charge' | 'security' | 'system'
  message: string
}

// 40 Parking Slots: Rows A, B, C, D (10 each)
const rows = ['A', 'B', 'C', 'D']
const cols = Array.from({ length: 10 }, (_, i) => i + 1)
const slots = ref<Slot[]>([])

// Telemetry & KPI Stats
const totalDailyVehicles = ref(142)
const totalWeeklyVehicles = ref(986)
const alertCount = ref(2)
const activeCameras = ref(4)
const simulationActive = ref(true)

// Selected Slot for Telemetry details
const selectedSlot = ref<Slot | null>(null)
const hoveredSlot = ref<Slot | null>(null)

// CCTV state
const activeCameraFeed = ref<number | null>(null)

// Charts Canvas refs
const trafficChartCanvas = ref<HTMLCanvasElement | null>(null)
const distributionChartCanvas = ref<HTMLCanvasElement | null>(null)
const peakHoursChartCanvas = ref<HTMLCanvasElement | null>(null)

let trafficChart: Chart | null = null
let distributionChart: Chart | null = null
let peakHoursChart: Chart | null = null

// Activity Feed Log entries
const logs = ref<LogEntry[]>([
  { id: '1', time: '19:00:05', type: 'system', message: 'Smart parking digital twin engine initialized successfully.' },
  { id: '2', time: '19:00:12', type: 'info', message: 'All 4 CCTV camera feeds online (Full HD).' },
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

// Get occupancy statistics
const occupiedCount = computed(() => slots.value.filter(s => s.occupied).length)
const vacantCount = computed(() => slots.value.filter(s => !s.occupied).length)
const occupancyRate = computed(() => {
  if (slots.value.length === 0) return 0
  return Math.round((occupiedCount.value / slots.value.length) * 100)
})

// Initialize slots
function initSlots() {
  const s: Slot[] = []
  for (const r of rows) {
    for (const c of cols) {
      s.push({
        id: `${r}${c < 10 ? '0' + c : c}`,
        occupied: false
      })
    }
  }
  slots.value = s

  // Seed initial parking state (approx 45% full)
  const initialOccupancy = 18
  for (let i = 0; i < initialOccupancy; i++) {
    const vacantList = slots.value.filter(slot => !slot.occupied)
    if (vacantList.length === 0) break
    const targetSlot = randomChoice(vacantList)
    
    targetSlot.occupied = true
    targetSlot.carColor = randomChoice(carColors)
    targetSlot.carType = randomChoice(carTypes)
    targetSlot.timestamp = Date.now() - (Math.random() * 4 * 60 * 60 * 1000) // parked 0 to 4 hours ago
  }
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
  if (!simulationActive.value) return

  const vacantList = slots.value.filter(s => !s.occupied)
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

    // Trigger chart update
    updateChartsTelemetry()

    // If occupancy is very high, fire alarm
    if (occupancyRate.value >= 85) {
      alertCount.value++
      addLog('alert', `CRITICAL ALERT: Parking Deck occupancy reaches ${occupancyRate.value}%. Staging backup facilities.`)
    }
  }

  // Schedule next arrival
  const nextDelay = 8000 + Math.random() * 8000 // 8-16s
  arrivalTimer = window.setTimeout(simulateArrival, nextDelay)
}

// Simulation vehicle departure
function simulateDeparture() {
  if (!simulationActive.value) return

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

    // Trigger chart update
    updateChartsTelemetry()
  }

  // Schedule next departure
  const nextDelay = 10000 + Math.random() * 10000 // 10-20s
  departureTimer = window.setTimeout(simulateDeparture, nextDelay)
}

// Toggles simulation running state
function toggleSimulation() {
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
  
  updateChartsTelemetry()
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

// CCTV selection popup helper
function viewCCTVFeed(idx: number) {
  activeCameraFeed.value = idx
  addLog('security', `Main display switched to Live CCTV Channel 0${idx + 1}.`)
}

// Render dynamic dashboard analytics charts
function initCharts() {
  // 1. Weekly Traffic Chart (Line)
  if (trafficChartCanvas.value) {
    const ctx = trafficChartCanvas.value.getContext('2d')
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 200)
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)')
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)')

      trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Daily Vehicles Visited',
            data: [120, 154, 138, 162, 185, 140, 142],
            borderColor: '#06b6d4',
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#06b6d4',
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
          }
        }
      })
    }
  }

  // 2. Vehicle Distribution (Doughnut)
  if (distributionChartCanvas.value) {
    const ctx = distributionChartCanvas.value.getContext('2d')
    if (ctx) {
      distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Sedan', 'SUV', 'Truck', 'EV'],
          datasets: [{
            data: [35, 45, 10, 10],
            backgroundColor: ['#6366f1', '#a855f7', '#f97316', '#10b981'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              position: 'right', 
              labels: { color: '#e2e8f0', font: { size: 10 }, boxWidth: 10 } 
            }
          },
          cutout: '70%'
        }
      })
    }
  }

  // 3. Peak Parking Hours (Bar)
  if (peakHoursChartCanvas.value) {
    const ctx = peakHoursChartCanvas.value.getContext('2d')
    if (ctx) {
      peakHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
          datasets: [{
            data: [65, 85, 95, 70, 75, 90, 50],
            backgroundColor: 'rgba(99, 102, 241, 0.85)',
            hoverBackgroundColor: '#6366f1',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
          }
        }
      })
    }
  }
}

// Calculate type ratios from active slots to update Doughnut chart in real-time
function updateChartsTelemetry() {
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

  // Ensure default weights if parking is completely empty
  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0)
  if (total > 0) {
    distributionChart.data.datasets[0]!.data = [
      typeCounts.Sedan,
      typeCounts.SUV,
      typeCounts.Truck,
      typeCounts.EV
    ]
  } else {
    distributionChart.data.datasets[0]!.data = [35, 45, 10, 10]
  }
  distributionChart.update()

  // Slightly perturb line chart to show live activity
  if (trafficChart) {
    const currentData = trafficChart.data.datasets[0]!.data as number[]
    // Add vehicle to today's count (Sunday)
    currentData[6] = totalDailyVehicles.value
    trafficChart.update()
  }
}

onMounted(() => {
  initSlots()
  
  // Brief delay to ensure DOM rendered fully before canvas mount
  setTimeout(() => {
    initCharts()
    updateChartsTelemetry()
  }, 300)

  // Start simulation engines
  if (simulationActive.value) {
    simulateArrival()
    simulateDeparture()
  }
})

onBeforeUnmount(() => {
  if (arrivalTimer) clearTimeout(arrivalTimer)
  if (departureTimer) clearTimeout(departureTimer)
  
  // Clean up ChartJS objects
  if (trafficChart) trafficChart.destroy()
  if (distributionChart) distributionChart.destroy()
  if (peakHoursChart) peakHoursChart.destroy()
})
</script>

<template>
  <div class="flex flex-col gap-6 text-slate-100 font-sans">
    
    <!-- SECTION A: KPI Stat Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Total Slots -->
      <div class="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md shadow-lg group hover:border-cyan-500/30 transition duration-300">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Slots</p>
            <h3 class="text-2xl font-black font-mono text-slate-100 mt-1">40</h3>
          </div>
          <div class="p-3 rounded-lg bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition duration-300">
            <Compass class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase">
          <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 inline" /> Dual deck infrastructure
        </div>
        <!-- Pulse effect line -->
        <span class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></span>
      </div>

      <!-- Occupied Slots -->
      <div class="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md shadow-lg group hover:border-orange-500/30 transition duration-300">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Occupied Slots</p>
            <h3 class="text-2xl font-black font-mono text-orange-400 mt-1 animate-pulse">{{ occupiedCount }}</h3>
          </div>
          <div class="p-3 rounded-lg bg-orange-950/50 border border-orange-500/20 text-orange-400 group-hover:scale-110 transition duration-300">
            <Car class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
          <span class="w-2 h-2 rounded-full bg-orange-500 inline-block animate-ping"></span>
          <span class="font-semibold uppercase text-slate-500">Real-time occupancy synced</span>
        </div>
        <span class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></span>
      </div>

      <!-- Occupancy Rate -->
      <div class="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md shadow-lg group hover:border-indigo-500/30 transition duration-300">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Occupancy Rate</p>
            <h3 class="text-2xl font-black font-mono text-indigo-400 mt-1">{{ occupancyRate }}%</h3>
          </div>
          <div class="p-3 rounded-lg bg-indigo-950/50 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition duration-300">
            <Activity class="w-5 h-5" />
          </div>
        </div>
        <!-- Simple progress bar -->
        <div class="mt-4.5 w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div class="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500" :style="{ width: `${occupancyRate}%` }"></div>
        </div>
        <span class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></span>
      </div>

      <!-- Alerts count -->
      <div class="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md shadow-lg group hover:border-red-500/30 transition duration-300">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Active Alerts</p>
            <h3 class="text-2xl font-black font-mono text-red-500 mt-1" :class="{ 'animate-bounce': alertCount > 0 }">{{ alertCount }}</h3>
          </div>
          <div class="p-3 rounded-lg bg-red-950/50 border border-red-500/20 text-red-500 group-hover:scale-110 transition duration-300">
            <ShieldAlert class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase">
          <AlertTriangle class="w-3.5 h-3.5 text-red-500 inline" /> Security protocols stable
        </div>
        <span class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></span>
      </div>
      
    </div>

    <!-- MAIN DISPLAY: 3D Twin & Inspect Panel -->
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
      
      <!-- 3D Map (Span 3 on large screens) -->
      <div class="xl:col-span-3 flex flex-col gap-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 class="text-lg font-black tracking-wider uppercase text-cyan-400 flex items-center gap-2">
              <Cpu class="w-5 h-5" /> Interactive 3D Digital Twin Model
            </h2>
            <p class="text-xs text-slate-500">Real-time WebGL space replication model of Deck-01.</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Simulation Status indicator -->
            <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <span class="w-2 h-2 rounded-full inline-block" :class="simulationActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'"></span>
              SIMULATION: {{ simulationActive ? 'Active' : 'Paused' }}
            </div>
            <button 
              @click="toggleSimulation" 
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold select-none cursor-pointer transition"
              :class="simulationActive ? 'bg-red-950/20 border-red-500/30 text-red-400 hover:bg-red-900/20' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/20'"
            >
              <component :is="simulationActive ? Pause : Play" class="w-3.5 h-3.5" /> 
              {{ simulationActive ? 'Pause Sim' : 'Resume Sim' }}
            </button>
          </div>
        </div>

        <!-- Mount the Three.js Interactive Parking Lot -->
        <ThreeParkingLot 
          :slots="slots" 
          @select-slot="handleSelectSlot"
          @hover-slot="handleHoverSlot"
        />
      </div>

      <!-- Holographic Interactive Telemetry Inspector Panel -->
      <div class="flex flex-col gap-4">
        <div class="border-b border-slate-800 pb-3">
          <h2 class="text-lg font-black tracking-wider uppercase text-cyan-400 flex items-center gap-2">
            <Activity class="w-5 h-5" /> Slot Telemetry
          </h2>
          <p class="text-xs text-slate-500">Select any slot in the 3D map to view details.</p>
        </div>

        <!-- Telemetry Panel Body -->
        <div class="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md shadow-lg flex flex-col justify-between min-h-[380px]">
          
          <template v-if="selectedSlot">
            <div>
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <span class="text-sm font-black text-cyan-400">SLOT {{ selectedSlot.id }}</span>
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-black uppercase border"
                  :class="selectedSlot.occupied ? 'bg-orange-950 border-orange-500/30 text-orange-400' : 'bg-emerald-950 border-emerald-500/30 text-emerald-400'"
                >
                  {{ selectedSlot.occupied ? 'Occupied' : 'Vacant' }}
                </span>
              </div>

              <!-- Occupied Status details -->
              <div v-if="selectedSlot.occupied" class="flex flex-col gap-3 mt-4">
                <div class="bg-slate-900/50 rounded-lg p-3 border border-slate-800 flex items-center gap-3">
                  <Car class="w-8 h-8 text-cyan-400" />
                  <div>
                    <h4 class="text-xs font-bold text-slate-400 uppercase">Vehicle Telemetry</h4>
                    <p class="text-sm font-black text-white mt-0.5">{{ selectedSlot.carColor }} {{ selectedSlot.carType }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 font-mono text-[10px] text-slate-400">
                  <div class="bg-slate-900/30 p-2.5 rounded border border-slate-800">
                    <span class="text-slate-500 block uppercase mb-1">Parked At</span>
                    <span class="font-bold text-slate-300">
                      {{ selectedSlot.timestamp ? new Date(selectedSlot.timestamp).toLocaleTimeString() : '—' }}
                    </span>
                  </div>
                  <div class="bg-slate-900/30 p-2.5 rounded border border-slate-800">
                    <span class="text-slate-500 block uppercase mb-1">Duration</span>
                    <span class="font-bold text-cyan-400">
                      {{ selectedSlot.timestamp ? Math.round((Date.now() - selectedSlot.timestamp) / 60000) : 0 }} mins
                    </span>
                  </div>
                </div>

                <!-- EV fast charging overlay if EV -->
                <div v-if="selectedSlot.carType === 'EV'" class="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3 flex flex-col gap-2 mt-2">
                  <div class="flex items-center justify-between text-xs text-emerald-400 font-extrabold uppercase">
                    <span class="flex items-center gap-1"><Zap class="w-3.5 h-3.5 fill-emerald-400" /> charging</span>
                    <span>84%</span>
                  </div>
                  <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full w-[84%] rounded-full animate-pulse"></div>
                  </div>
                  <span class="text-[9px] text-slate-500">Fast Charger Model EC-30. Max output 120kW.</span>
                </div>
              </div>

              <!-- Vacant Status details -->
              <div v-else class="flex flex-col items-center justify-center py-12 text-slate-500">
                <Compass class="w-12 h-12 text-slate-700 animate-spin" style="animation-duration: 20s" />
                <p class="text-xs font-bold uppercase tracking-wider mt-4">Space is Empty</p>
                <p class="text-[10px] text-slate-600 text-center mt-1">Ready for incoming vehicle sensor triggers.</p>
              </div>
            </div>

            <!-- Manual override action buttons -->
            <div class="border-t border-slate-800 pt-4 flex flex-col gap-2 mt-6">
              <button 
                @click="manualToggleSlot(selectedSlot.id)"
                class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold cursor-pointer select-none text-slate-300 transition"
              >
                <RefreshCw class="w-3.5 h-3.5 text-cyan-400" /> Force State Toggle
              </button>
              <button 
                @click="selectedSlot = null"
                class="w-full px-3 py-2 rounded-lg text-slate-600 hover:text-slate-400 text-[10px] uppercase font-bold tracking-wider text-center select-none cursor-pointer"
              >
                Deselect telemetry
              </button>
            </div>

          </template>
          <template v-else>
            <!-- No select placeholder -->
            <div class="flex-1 flex flex-col items-center justify-center py-8 text-center select-none">
              <div class="relative w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-600 mb-4 shadow-inner">
                <Server class="w-7 h-7 text-cyan-600/60 animate-pulse" />
              </div>
              <p class="text-xs font-black uppercase text-slate-400 tracking-wider">No Telemetry Node Connected</p>
              <p class="text-[10px] text-slate-500 max-w-[180px] mt-1.5 leading-relaxed">
                Click on any parking slot in the 3D view to inspect sensors, cameras, and vehicle parameters.
              </p>
            </div>
          </template>

        </div>
      </div>
    </div>

    <!-- SECTION B & E: CCTV Feed Grid & Scrolling Live Activity log -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- CCTV Grid (Span 2) -->
      <div class="lg:col-span-2 flex flex-col gap-4">
        <div class="border-b border-slate-800 pb-3 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-black tracking-wider uppercase text-cyan-400 flex items-center gap-2">
              <Video class="w-5 h-5" /> Camera Systems (CCTV)
            </h2>
            <p class="text-xs text-slate-500">Live artificial intelligent optical parking sensor matrix.</p>
          </div>
          <span class="text-[10px] font-mono font-black text-cyan-500 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded uppercase">
            HEVC STREAMING (4CH)
          </span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Fake CCTV Feed 1 -->
          <div 
            v-for="(cam, idx) in ['Camera A01', 'Entrance Cam', 'Exit Gate', 'Zone B Cam']" 
            :key="idx"
            class="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 h-[140px] shadow-lg cursor-pointer hover:border-cyan-500/30 transition duration-300"
            @click="viewCCTVFeed(idx)"
          >
            <!-- Camera Name Tag overlay -->
            <div class="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[9px] font-bold text-slate-300">
              <Eye class="w-3 h-3 text-cyan-400" /> {{ cam }}
            </div>

            <!-- Blink REC overlay -->
            <div class="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[9px] font-bold">
              <span class="relative flex h-1.5 w-1.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <span class="text-red-400 font-extrabold uppercase">REC</span>
            </div>

            <!-- Static noise/CCTV effect overlay -->
            <div class="absolute inset-0 bg-cctv-scanlines z-10 pointer-events-none opacity-20 group-hover:opacity-40 transition duration-300"></div>

            <!-- Dynamic Clock -->
            <div class="absolute bottom-2 left-2 z-20 font-mono text-[8px] text-slate-500 tracking-wider">
              2026-05-24 T{{ new Date().toTimeString().split(' ')[0] }}
            </div>

            <!-- CCTV Feed Graphic rendering -->
            <div class="w-full h-full flex flex-col items-center justify-center bg-slate-950 relative">
              <!-- Holographic schematic -->
              <div class="absolute w-20 h-20 rounded-full border border-cyan-500/5 opacity-5 flex items-center justify-center animate-spin" style="animation-duration: 40s">
                <Compass class="w-10 h-10" />
              </div>
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-600 font-mono group-hover:text-cyan-400 transition duration-300 z-20">
                CH 0{{ idx + 1 }} LIVE
              </div>
              <!-- CCTV scanning interference lines -->
              <span class="absolute w-full h-[1px] bg-cyan-500/10 top-0 left-0 animate-scanline"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Realtime Event Logger Activity Feed -->
      <div class="flex flex-col gap-4">
        <div class="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h2 class="text-lg font-black tracking-wider uppercase text-cyan-400 flex items-center gap-2">
            <Activity class="w-5 h-5" /> Activity Log
          </h2>
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Feeds</span>
        </div>

        <div class="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-4 backdrop-blur-md shadow-lg flex flex-col justify-between min-h-[300px]">
          <div 
            ref="logsContainerRef"
            class="flex-1 overflow-y-auto max-h-[250px] flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent pr-1"
          >
            <div 
              v-for="log in logs" 
              :key="log.id"
              class="flex items-start gap-2.5 text-[10px] border-b border-slate-900/60 pb-2 last:border-0"
            >
              <span class="font-mono text-slate-600 font-bold mt-0.5">{{ log.time }}</span>
              
              <!-- Color Tags based on Log Type -->
              <span 
                class="px-1.5 py-0.2 rounded font-black tracking-widest uppercase text-[8px] shrink-0 mt-0.5 border"
                :class="{
                  'bg-cyan-950/50 border-cyan-500/20 text-cyan-400': log.type === 'info',
                  'bg-orange-950/50 border-orange-500/20 text-orange-400': log.type === 'alert',
                  'bg-emerald-950/50 border-emerald-500/20 text-emerald-400': log.type === 'charge',
                  'bg-red-950/50 border-red-500/20 text-red-400': log.type === 'security',
                  'bg-indigo-950/50 border-indigo-500/20 text-indigo-400': log.type === 'system'
                }"
              >
                {{ log.type }}
              </span>

              <span class="text-slate-300 leading-relaxed">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- SECTION C: Parking Analytics Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Traffic line chart -->
      <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md shadow-lg flex flex-col gap-4">
        <h3 class="text-xs font-black tracking-widest uppercase text-cyan-400 flex items-center gap-1.5 border-b border-slate-900 pb-2">
          <TrendingUp class="w-4.5 h-4.5" /> Weekly Vehicles traffic
        </h3>
        <div class="relative h-[200px] w-full">
          <canvas ref="trafficChartCanvas"></canvas>
        </div>
      </div>

      <!-- Vehicle types breakdown doughnut chart -->
      <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md shadow-lg flex flex-col gap-4">
        <h3 class="text-xs font-black tracking-widest uppercase text-cyan-400 flex items-center gap-1.5 border-b border-slate-900 pb-2">
          <PieChart class="w-4.5 h-4.5" /> Vehicle Type Distribution
        </h3>
        <div class="relative h-[200px] w-full flex items-center justify-center">
          <canvas ref="distributionChartCanvas"></canvas>
        </div>
      </div>

      <!-- Peak parking hours bar chart -->
      <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md shadow-lg flex flex-col gap-4">
        <h3 class="text-xs font-black tracking-widest uppercase text-cyan-400 flex items-center gap-1.5 border-b border-slate-900 pb-2">
          <Clock class="w-4.5 h-4.5" /> Peak Parking Hours
        </h3>
        <div class="relative h-[200px] w-full">
          <canvas ref="peakHoursChartCanvas"></canvas>
        </div>
      </div>

    </div>
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
  background: #1e293b;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #0ea5e9;
}
</style>
