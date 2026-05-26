<script setup lang="ts">
import { ref, inject } from "vue"
import { ChevronRight, Radio } from 'lucide-vue-next'
import ParkingDashboard from "./ParkingDashboard.vue"
import Guide from "./Guide.vue"
import HistoryComponent from "./History.vue"
import Sidebar from "./layout/Sidebar.vue"

const isDark = inject<any>('isDark')
const t = inject<any>('t')

const currentTab = ref("dashboard")
const isCollapsed = ref(false)

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="flex flex-1 min-h-0 relative transition-colors duration-300"
    :class="isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'">
    <!-- COLLAPSIBLE SIDEBAR -->
    <Sidebar v-model:currentTab="currentTab" :isCollapsed="isCollapsed" @toggleSidebar="toggleSidebar" />

    <!-- MAIN BODY CONTENT AREA -->
    <main class="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-8 relative">
      <!-- Background subtle cyber glows -->
      <div v-if="isDark"
        class="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/2 filter blur-[150px] pointer-events-none">
      </div>
      <div v-if="isDark"
        class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/2 filter blur-[150px] pointer-events-none">
      </div>
      <div v-if="!isDark"
        class="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.025] filter blur-[150px] pointer-events-none">
      </div>
      <div v-if="!isDark"
        class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.025] filter blur-[150px] pointer-events-none">
      </div>

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
            :class="isDark ? 'bg-slate-950 border-slate-900 text-slate-700' : 'bg-white border-slate-200 text-slate-400'">
            <div class="w-full h-full rounded-2xl flex items-center justify-center border"
              :class="isDark ? 'bg-slate-900 border-slate-850' : 'bg-slate-50 border-slate-100'">
              <Radio class="w-8 h-8 animate-pulse" :class="isDark ? 'text-cyan-600/40' : 'text-cyan-600/60'" />
            </div>
            <span class="absolute top-0 right-0 w-3 h-3 rounded-full bg-orange-500 border-2 animate-ping"
              :class="isDark ? 'border-slate-950' : 'border-white'"></span>
            <span class="absolute top-0 right-0 w-3 h-3 rounded-full bg-orange-500 border-2"
              :class="isDark ? 'border-slate-950' : 'border-white'"></span>
          </div>
          <h2 class="text-lg font-black tracking-widest uppercase"
            :class="isDark ? 'text-slate-300' : 'text-slate-700'">{{ t('nodes_offline') }}</h2>
          <p class="text-xs max-w-sm mt-2 leading-relaxed" :class="isDark ? 'text-slate-500' : 'text-slate-500'">
            {{ t('nodes_offline_desc') }}
          </p>
          <button @click="currentTab = 'dashboard'"
            class="mt-6 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer select-none border"
            :class="isDark
              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20'
              : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100 shadow-sm'">
            {{ t('return_core') }}
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  </div>
</template>


<style scoped>
/* Sidebar and main scrolling optimizations */
</style>
