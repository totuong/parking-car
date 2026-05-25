<template>
  <footer 
    class="px-6 py-4 border-t text-xs flex flex-wrap items-center justify-between gap-4 select-none transition-all duration-300"
    :class="isDark 
      ? 'border-slate-900 bg-slate-950/90 text-slate-500' 
      : 'border-slate-200 bg-white/95 text-slate-600 shadow-[0_-2px_15px_rgba(0,0,0,0.01)]'"
  >
    <!-- Left Section -->
    <div class="flex items-center gap-2.5">
      <span class="font-bold transition-colors duration-300" :class="isDark ? 'text-slate-400' : 'text-slate-700'">© 2026 PARKING TWIN</span>
      <span :class="isDark ? 'text-slate-800' : 'text-slate-200'">|</span>
      <span class="text-[10px] tracking-widest font-black text-cyan-500/80 uppercase">{{ t('foot_integrated') }}</span>
    </div>

    <!-- Center Section -->
    <div 
      class="hidden md:flex items-center gap-6 font-mono text-[10px] uppercase transition-colors duration-300"
      :class="isDark ? 'text-slate-400' : 'text-slate-600'"
    >
      <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span><span>{{ t('foot_sync') }}</span></div>
      <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span><span>{{ t('foot_latency') }}</span></div>
      <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span><span>{{ t('foot_gpu') }}</span></div>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-3 text-[10px] font-bold" :class="isDark ? 'text-slate-400' : 'text-slate-600'">
      <span 
        class="px-2 py-0.5 rounded font-mono transition-colors duration-300"
        :class="isDark ? 'bg-slate-900 border border-slate-800 text-cyan-400' : 'bg-slate-50 border border-slate-200 text-cyan-600'"
      >
        {{ t('foot_engine') }}
      </span>
      <span class="hidden sm:inline font-semibold italic text-slate-500">{{ t('foot_presentation') }}</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { inject } from 'vue'
const isDark = inject<any>('isDark')
const t = inject<any>('t')
</script>


<style scoped>
footer {
  border-image: linear-gradient(to right, rgba(6,182,212,0), rgba(6,182,212,0.15) 50%, rgba(6,182,212,0)) 1;
}
</style>
