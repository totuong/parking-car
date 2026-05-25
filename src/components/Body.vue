<script setup lang="ts">
import { ref } from "vue"
import { 
  LayoutDashboard, Eye, BarChart3, FileText, Camera, Map, Settings, 
  ChevronLeft, ChevronRight, HelpCircle, History, Radio
} from 'lucide-vue-next'
import ParkingDashboard from "./ParkingDashboard.vue"
import Guide from "./Guide.vue"
import HistoryComponent from "./History.vue"

const currentTab = ref("dashboard")
const isCollapsed = ref(false)

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "monitoring", label: "Realtime Monitoring", icon: Eye, offline: true },
  { key: "analytics", label: "Analytics", icon: BarChart3, offline: true },
  { key: "reports", label: "Reports", icon: FileText, offline: true },
  { key: "camera", label: "Camera System", icon: Camera, offline: true },
  { key: "zones", label: "Parking Zones", icon: Map, offline: true },
  { key: "settings", label: "Settings", icon: Settings, offline: true },
  { key: "guide", label: "Guide & Docs", icon: HelpCircle },
  { key: "history", label: "System History", icon: History },
]

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="flex flex-1 min-h-0 relative bg-slate-950 text-slate-100">
    <!-- COLLAPSIBLE SIDEBAR -->
    <aside
      class="relative flex flex-col py-6 border-r border-slate-900 bg-slate-950/80 backdrop-blur-md transition-all duration-300 z-30 select-none"
      :class="isCollapsed ? 'w-20 px-2' : 'w-64 px-4'"
    >
      <!-- Navigation Header -->
      <div class="flex items-center mb-6" :class="isCollapsed ? 'justify-center' : 'justify-between px-2'">
        <span v-if="!isCollapsed" class="text-[10px] font-black tracking-widest text-slate-500 uppercase">
          Navigation Nodes
        </span>
        <button 
          @click="toggleSidebar"
          class="p-1.5 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition cursor-pointer"
          :title="isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'"
        >
          <ChevronRight v-if="isCollapsed" class="w-4 h-4" />
          <ChevronLeft v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation list items -->
      <nav class="flex-1 flex flex-col gap-1.5">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="relative flex items-center rounded-xl transition duration-200 outline-none text-left cursor-pointer group"
          :class="[
            isCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3',
            currentTab === item.key
              ? 'bg-cyan-500/10 text-cyan-400 font-extrabold border border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.06)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
          ]"
          @click="currentTab = item.key"
          :title="item.label"
        >
          <!-- Active glowing node dot indicator -->
          <span 
            v-if="currentTab === item.key" 
            class="absolute left-0 w-[3px] h-1/2 bg-cyan-400 rounded-r shadow-[0_0_10px_#06b6d4]"
          ></span>

          <!-- Lucide Icon -->
          <component 
            :is="item.icon" 
            class="w-5 h-5 transition duration-200"
            :class="currentTab === item.key ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'"
          />

          <!-- Label text -->
          <span v-if="!isCollapsed" class="text-xs tracking-wider uppercase font-semibold">
            {{ item.label }}
          </span>

          <!-- Offline status label for placeholder items -->
          <span 
            v-if="!isCollapsed && item.offline" 
            class="ml-auto text-[7px] font-black tracking-widest uppercase bg-slate-900 px-1 py-0.2 rounded border border-slate-800 text-slate-600 scale-90"
          >
            Offline
          </span>
        </button>
      </nav>

      <!-- Sidebar footer block -->
      <div v-if="!isCollapsed" class="border-t border-slate-900/80 pt-4 px-2 flex items-center gap-2 text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">
        <Radio class="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
        <span>Telemetry Core: Up</span>
      </div>
    </aside>

    <!-- MAIN BODY CONTENT AREA -->
    <main class="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-8 relative">
      <!-- Background subtle cyber glows -->
      <div class="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/2 filter blur-[150px] pointer-events-none"></div>
      <div class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/2 filter blur-[150px] pointer-events-none"></div>

      <!-- MAIN TABS CONTAINER -->
      <div class="relative z-10">
        <div v-if="currentTab === 'dashboard'">
          <ParkingDashboard />
        </div>
        
        <div v-else-if="currentTab === 'guide'">
          <Guide />
        </div>
        
        <div v-else-if="currentTab === 'history'">
          <HistoryComponent />
        </div>
        
        <!-- Beautiful offline placeholder pages for unimplemented sections -->
        <div v-else class="flex flex-col items-center justify-center py-20 text-center select-none">
          <div class="relative w-20 h-20 rounded-3xl bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-700 shadow-2xl mb-6 p-[2px]">
            <div class="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-850">
              <Radio class="w-8 h-8 text-cyan-600/40 animate-pulse" />
            </div>
            <span class="absolute top-0 right-0 w-3 h-3 rounded-full bg-orange-500 border-2 border-slate-950 animate-ping"></span>
            <span class="absolute top-0 right-0 w-3 h-3 rounded-full bg-orange-500 border-2 border-slate-950"></span>
          </div>
          <h2 class="text-lg font-black tracking-widest uppercase text-slate-300">Node Calibrations Offline</h2>
          <p class="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
            The telemetry interface node for this segment is currently processing offline database synchronization. Sensor metrics will resume shortly.
          </p>
          <button 
            @click="currentTab = 'dashboard'"
            class="mt-6 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20 text-xs font-bold transition cursor-pointer select-none"
          >
            Return to Core Dashboard <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Sidebar and main scrolling optimizations */
</style>
