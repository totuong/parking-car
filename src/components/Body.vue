<script setup lang="ts">
import { ref, inject } from "vue"
import { 
  LayoutDashboard, Eye, BarChart3, FileText, Camera, Map, Settings, 
  ChevronLeft, ChevronRight, HelpCircle, History, Radio
} from 'lucide-vue-next'
import ParkingDashboard from "./ParkingDashboard.vue"
import Guide from "./Guide.vue"
import HistoryComponent from "./History.vue"

const isDark = inject<any>('isDark')
const t = inject<any>('t')

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
  <div class="flex flex-1 min-h-0 relative transition-colors duration-300" :class="isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'">
    <!-- COLLAPSIBLE SIDEBAR -->
    <aside
      class="relative flex flex-col py-6 border-r transition-all duration-300 z-30 select-none"
      :class="[
        isCollapsed ? 'w-20 px-2' : 'w-64 px-4',
        isDark 
          ? 'border-slate-900 bg-slate-950/80 backdrop-blur-md' 
          : 'border-slate-200 bg-white/80 backdrop-blur-md shadow-[2px_0_15px_rgba(0,0,0,0.01)]'
      ]"
    >
      <!-- Navigation Header -->
      <div class="flex items-center mb-6" :class="isCollapsed ? 'justify-center' : 'justify-between px-2'">
        <span 
          v-if="!isCollapsed" 
          class="text-[10px] font-black tracking-widest uppercase transition-colors duration-300"
          :class="isDark ? 'text-slate-500' : 'text-slate-400'"
        >
          {{ t('nav_nodes') }}
        </span>
        <button 
          @click="toggleSidebar"
          class="p-1.5 rounded-lg border transition cursor-pointer"
          :class="isDark 
            ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30' 
            : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-cyan-600 hover:border-cyan-500/40'"
          :title="isCollapsed ? t('nav_expand') : t('nav_collapse')"
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
          class="relative flex items-center rounded-xl transition duration-205 outline-none text-left cursor-pointer group"
          :class="[
            isCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3',
            currentTab === item.key
              ? (isDark 
                  ? 'bg-cyan-500/10 text-cyan-400 font-extrabold border border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.06)]' 
                  : 'bg-cyan-500/10 text-cyan-600 font-extrabold border border-cyan-500/20 shadow-sm')
              : (isDark 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent')
          ]"
          @click="currentTab = item.key"
          :title="t('nav_' + item.key)"
        >
          <!-- Active glowing node dot indicator -->
          <span 
            v-if="currentTab === item.key" 
            class="absolute left-0 w-[3px] h-1/2 rounded-r transition-all duration-300"
            :class="isDark ? 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]' : 'bg-cyan-500'"
          ></span>

          <!-- Lucide Icon -->
          <component 
            :is="item.icon" 
            class="w-5 h-5 transition duration-200"
            :class="currentTab === item.key 
              ? (isDark ? 'text-cyan-400' : 'text-cyan-600') 
              : (isDark ? 'text-slate-400 group-hover:text-cyan-400' : 'text-slate-550 text-slate-500 group-hover:text-cyan-600')"
          />

          <!-- Label text -->
          <span v-if="!isCollapsed" class="text-xs tracking-wider uppercase font-semibold">
            {{ t('nav_' + item.key) }}
          </span>

          <!-- Offline status label for placeholder items -->
          <span 
            v-if="!isCollapsed && item.offline" 
            class="ml-auto text-[7px] font-black tracking-widest uppercase px-1 py-0.2 rounded border scale-90 transition-all duration-300"
            :class="isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-600' 
              : 'bg-slate-100 border-slate-200 text-slate-400'"
          >
            Offline
          </span>
        </button>
      </nav>

      <!-- Sidebar footer block -->
      <div 
        v-if="!isCollapsed" 
        class="border-t pt-4 px-2 flex items-center gap-2 text-[10px] uppercase font-mono font-bold tracking-wider transition-colors duration-300"
        :class="isDark ? 'border-slate-900/80 text-slate-550 text-slate-500' : 'border-slate-200 text-slate-400'"
      >
        <Radio class="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
        <span>{{ t('telemetry_core_up') }}</span>
      </div>
    </aside>

    <!-- MAIN BODY CONTENT AREA -->
    <main class="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-8 relative">
      <!-- Background subtle cyber glows -->
      <div v-if="isDark" class="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/2 filter blur-[150px] pointer-events-none"></div>
      <div v-if="isDark" class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/2 filter blur-[150px] pointer-events-none"></div>
      <div v-if="!isDark" class="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.025] filter blur-[150px] pointer-events-none"></div>
      <div v-if="!isDark" class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.025] filter blur-[150px] pointer-events-none"></div>

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
          <div 
            class="relative w-20 h-20 rounded-3xl border flex items-center justify-center shadow-2xl mb-6 p-[2px] transition-all duration-300"
            :class="isDark ? 'bg-slate-950 border-slate-900 text-slate-700' : 'bg-white border-slate-200 text-slate-400'"
          >
            <div 
              class="w-full h-full rounded-2xl flex items-center justify-center border"
              :class="isDark ? 'bg-slate-900 border-slate-850' : 'bg-slate-50 border-slate-100'"
            >
              <Radio class="w-8 h-8 animate-pulse" :class="isDark ? 'text-cyan-600/40' : 'text-cyan-600/60'" />
            </div>
            <span class="absolute top-0 right-0 w-3 h-3 rounded-full bg-orange-500 border-2 animate-ping" :class="isDark ? 'border-slate-950' : 'border-white'"></span>
            <span class="absolute top-0 right-0 w-3 h-3 rounded-full bg-orange-500 border-2" :class="isDark ? 'border-slate-950' : 'border-white'"></span>
          </div>
          <h2 class="text-lg font-black tracking-widest uppercase" :class="isDark ? 'text-slate-300' : 'text-slate-700'">{{ t('nodes_offline') }}</h2>
          <p class="text-xs max-w-sm mt-2 leading-relaxed" :class="isDark ? 'text-slate-500' : 'text-slate-500'">
            {{ t('nodes_offline_desc') }}
          </p>
          <button 
            @click="currentTab = 'dashboard'"
            class="mt-6 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer select-none border"
            :class="isDark 
              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20' 
              : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100 shadow-sm'"
          >
            {{ t('return_core') }} <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  </div>
</template>


<style scoped>
/* Sidebar and main scrolling optimizations */
</style>

