<script setup lang="ts">
import { inject } from 'vue'
import { BookOpen, Compass, Eye, ShieldAlert, Cpu, ArrowRight } from 'lucide-vue-next'

const isDark = inject<any>('isDark')
const t = inject<any>('t')
</script>

<template>
  <div class="flex flex-col gap-6 transition-colors duration-300" :class="isDark ? 'text-slate-200' : 'text-slate-800'">
    <div class="border-b pb-4" :class="isDark ? 'border-slate-800' : 'border-slate-200'">
      <h2 
        class="text-xl font-black tracking-widest uppercase flex items-center gap-2 transition-colors duration-300"
        :class="isDark ? 'text-cyan-400' : 'text-cyan-600'"
      >
        <BookOpen class="w-6 h-6" /> {{ t('guide_title') }}
      </h2>
      <p class="text-xs mt-1 uppercase tracking-wider font-mono" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('guide_subtitle') }}</p>
    </div>

    <!-- Operations content grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 3D Digital Twin Panel -->
      <div 
        class="rounded-2xl border p-6 backdrop-blur-md shadow-lg flex flex-col gap-4 transition-all duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60' 
          : 'border-slate-200 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.015)]'"
      >
        <h3 
          class="text-sm font-black uppercase flex items-center gap-2 border-b pb-2 transition-colors duration-300"
          :class="isDark ? 'text-cyan-400 border-slate-900' : 'text-cyan-600 border-slate-100'"
        >
          <Compass class="w-5 h-5 text-indigo-500" /> {{ t('guide_sec1_title') }}
        </h3>
        <p class="text-xs leading-relaxed" :class="isDark ? 'text-slate-400' : 'text-slate-600'">
          {{ t('guide_sec1_desc') }}
        </p>
        <ul 
          class="text-[11px] flex flex-col gap-2.5 p-4 rounded-xl border transition-all duration-300"
          :class="isDark 
            ? 'bg-slate-900/30 border-slate-900/50 text-slate-400' 
            : 'bg-slate-50 border-slate-150 text-slate-600'"
        >
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" /> <span><strong>{{ t('guide_rotations_title') }}</strong> {{ t('guide_rotations_desc') }}</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" /> <span><strong>{{ t('guide_panning_title') }}</strong> {{ t('guide_panning_desc') }}</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" /> <span><strong>{{ t('guide_zoom_title') }}</strong> {{ t('guide_zoom_desc') }}</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" /> <span><strong>{{ t('guide_presets_title') }}</strong> {{ t('guide_presets_desc') }}</span></li>
        </ul>
      </div>

      <!-- Live Monitoring Sensors -->
      <div 
        class="rounded-2xl border p-6 backdrop-blur-md shadow-lg flex flex-col gap-4 transition-all duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60' 
          : 'border-slate-200 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.015)]'"
      >
        <h3 
          class="text-sm font-black uppercase flex items-center gap-2 border-b pb-2 transition-colors duration-300"
          :class="isDark ? 'text-cyan-400 border-slate-900' : 'text-cyan-600 border-slate-100'"
        >
          <Eye class="w-5 h-5 text-emerald-500" /> {{ t('guide_sec2_title') }}
        </h3>
        <p class="text-xs leading-relaxed" :class="isDark ? 'text-slate-400' : 'text-slate-600'">
          {{ t('guide_sec2_desc') }}
        </p>
        <ul 
          class="text-[11px] flex flex-col gap-2.5 p-4 rounded-xl border transition-all duration-300"
          :class="isDark 
            ? 'bg-slate-900/30 border-slate-900/50 text-slate-400' 
            : 'bg-slate-50 border-slate-150 text-slate-600'"
        >
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" /> <span><strong>{{ t('guide_hover_title') }}</strong> {{ t('guide_hover_desc') }}</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" /> <span><strong>{{ t('guide_select_title') }}</strong> {{ t('guide_select_desc') }}</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" /> <span><strong>{{ t('guide_cctv_title') }}</strong> {{ t('guide_cctv_desc') }}</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" /> <span><strong>{{ t('guide_sim_title') }}</strong> {{ t('guide_sim_desc') }}</span></li>
        </ul>
      </div>

      <!-- EV Fast Charging & Smart Grid -->
      <div 
        class="rounded-2xl border p-6 backdrop-blur-md shadow-lg flex flex-col gap-4 transition-all duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60' 
          : 'border-slate-200 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.015)]'"
      >
        <h3 
          class="text-sm font-black uppercase flex items-center gap-2 border-b pb-2 transition-colors duration-300"
          :class="isDark ? 'text-cyan-400 border-slate-900' : 'text-cyan-600 border-slate-100'"
        >
          <Cpu class="w-5 h-5 text-indigo-500" /> {{ t('guide_sec3_title') }}
        </h3>
        <p class="text-xs leading-relaxed" :class="isDark ? 'text-slate-400' : 'text-slate-600'">
          {{ t('guide_sec3_desc') }}
        </p>
        <div 
          class="text-[11px] flex items-start gap-3 p-4 rounded-xl border transition-all duration-300"
          :class="isDark 
            ? 'bg-slate-900/30 border-slate-900/50 text-slate-400' 
            : 'bg-slate-50 border-slate-150 text-slate-600'"
        >
          <ShieldAlert class="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
          <p class="leading-relaxed">
            {{ t('guide_ev_desc') }}
          </p>
        </div>
      </div>

      <!-- Architecture and WebSockets -->
      <div 
        class="rounded-2xl border p-6 backdrop-blur-md shadow-lg flex flex-col gap-4 transition-all duration-300"
        :class="isDark 
          ? 'border-slate-800 bg-slate-950/60' 
          : 'border-slate-200 bg-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.015)]'"
      >
        <h3 
          class="text-sm font-black uppercase flex items-center gap-2 border-b pb-2 transition-colors duration-300"
          :class="isDark ? 'text-cyan-400 border-slate-900' : 'text-cyan-600 border-slate-100'"
        >
          <Cpu class="w-5 h-5 text-cyan-500" /> {{ t('guide_sec4_title') }}
        </h3>
        <p class="text-xs leading-relaxed" :class="isDark ? 'text-slate-400' : 'text-slate-600'">
          {{ t('guide_sec4_desc') }}
        </p>
        <div 
          class="text-[11px] flex items-start gap-3 p-4 rounded-xl border transition-all duration-300"
          :class="isDark 
            ? 'bg-slate-900/30 border-slate-900/50 text-slate-400' 
            : 'bg-slate-50 border-slate-150 text-slate-600'"
        >
          <Cpu class="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
          <p class="leading-relaxed font-mono">
            {{ t('guide_socket_desc') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom doc aesthetics */
</style>
