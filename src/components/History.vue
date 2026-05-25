<script setup lang="ts">
import { inject } from 'vue'
import { History, Activity, ShieldAlert, Cpu } from 'lucide-vue-next'

const isDark = inject<any>('isDark')
const t = inject<any>('t')

const systemMilestones = [
  { time: '2026-05-24 19:00:00', titleKey: 'mile_t1', status: 'SUCCESS', descKey: 'mile_d1' },
  { time: '2026-05-24 16:30:15', titleKey: 'mile_t2', status: 'ONLINE', descKey: 'mile_d2' },
  { time: '2026-05-24 12:00:00', titleKey: 'mile_t3', status: 'SYNCED', descKey: 'mile_d3' },
  { time: '2026-05-23 09:15:30', titleKey: 'mile_t4', status: 'HEALTHY', descKey: 'mile_d4' },
  { time: '2026-05-22 14:00:00', titleKey: 'mile_t5', status: 'DEPLOYED', descKey: 'mile_d5' },
]
</script>

<template>
  <div class="flex flex-col gap-6 transition-colors duration-300" :class="isDark ? 'text-slate-200' : 'text-slate-800'">
    <div class="border-b pb-4 flex items-center justify-between" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
      <div>
        <h2 
          class="text-xl font-black tracking-widest uppercase flex items-center gap-2 transition-colors duration-300"
          :class="isDark ? 'text-cyan-400' : 'text-cyan-600'"
        >
          <History class="w-6 h-6" /> {{ t('hist_title') }}
        </h2>
        <p class="text-xs mt-1 uppercase tracking-wider font-mono" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('hist_subtitle') }}</p>
      </div>
      <div 
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300"
        :class="isDark 
          ? 'bg-indigo-950/30 border-indigo-500/20 text-indigo-400' 
          : 'bg-indigo-50 border-indigo-200 text-indigo-650 text-indigo-600'"
      >
        <Activity class="w-3.5 h-3.5" :class="isDark ? 'text-indigo-400' : 'text-indigo-600'" />
        <span class="text-[10px] font-mono font-black uppercase tracking-widest">
          {{ t('hist_uptime') }}
        </span>
      </div>
    </div>

    <!-- Timeline Layout -->
    <div 
      class="rounded-2xl border p-6 backdrop-blur-md shadow-lg flex flex-col gap-6 transition-all duration-300"
      :class="isDark 
        ? 'border-slate-800 bg-slate-950/60' 
        : 'border-slate-200 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.015)]'"
    >
      
      <div class="relative pl-6 border-l flex flex-col gap-8" :class="isDark ? 'border-slate-850' : 'border-slate-200'">
        <div 
          v-for="(mile, idx) in systemMilestones" 
          :key="idx" 
          class="relative flex flex-col gap-1.5"
        >
          <!-- Bullet dot with neon glow -->
          <span 
            class="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all duration-300"
            :class="isDark ? 'bg-slate-950 border-cyan-500/50' : 'bg-white border-cyan-500/50'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
          </span>

          <div class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-[10px] font-bold" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ mile.time }}</span>
            <span class="text-xs font-black uppercase tracking-wide" :class="isDark ? 'text-slate-200' : 'text-slate-700'">{{ t(mile.titleKey) }}</span>
            
            <span 
              class="px-1.5 py-0.2 rounded font-mono font-black text-[8px] tracking-wider uppercase border transition-colors duration-300"
              :class="isDark 
                ? 'bg-slate-900 border-slate-800 text-cyan-400' 
                : 'bg-slate-50 border-slate-200 text-cyan-600'"
            >
              {{ mile.status }}
            </span>
          </div>

          <p 
            class="text-xs leading-relaxed max-w-2xl p-3 rounded-lg border mt-1 transition-all duration-300"
            :class="isDark 
              ? 'text-slate-400 bg-slate-900/20 border-slate-900/50' 
              : 'text-slate-650 text-slate-600 bg-slate-50 border-slate-150'"
          >
            {{ t(mile.descKey) }}
          </p>
        </div>
      </div>

      <!-- Footer system health info -->
      <div 
        class="pt-6 flex items-center gap-3 p-4 rounded-xl border mt-4 text-[11px] font-medium transition-all duration-300"
        :class="isDark 
          ? 'border-slate-850 bg-slate-900/10 text-slate-400' 
          : 'border-slate-200 bg-slate-50/50 text-slate-650 text-slate-600'"
      >
        <Cpu class="w-5 h-5 text-cyan-500 shrink-0" />
        <p class="leading-relaxed">
          {{ t('hist_footer') }}
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Timeline indicators */
</style>
