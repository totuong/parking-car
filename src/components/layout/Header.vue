<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Activity, Bell, Shield, Cpu } from 'lucide-vue-next'

const clock = ref(new Date())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    clock.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <header class="sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,243,255,0.03)] transition-all">
    <!-- Brand / Logo -->
    <div class="flex items-center gap-3 select-none">
      <div class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse">
        <Cpu class="w-5 h-5 text-white" />
        <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900"></span>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-200 to-white uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            Parking Twin
          </h1>
          <span class="px-1.5 py-0.5 text-[9px] font-black tracking-widest text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 rounded uppercase">
            v1.0.0
          </span>
        </div>
        <p class="text-slate-400 text-[10px] font-medium tracking-wide uppercase mt-0.5 flex items-center gap-1.5">
          <Activity class="w-3 h-3 text-cyan-400 inline" /> Smart City IoT Control Center
        </p>
      </div>
    </div>

    <!-- Actions / Ticker / System Info -->
    <div class="flex items-center gap-6">
      <!-- Live Clock -->
      <div class="hidden sm:flex flex-col items-end font-mono">
        <span class="text-xs text-slate-500 font-bold uppercase tracking-wider">System Clock</span>
        <span class="text-sm font-extrabold text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
          {{ clock.toLocaleDateString() }} - {{ clock.toLocaleTimeString() }}
        </span>
      </div>

      <!-- Divider -->
      <div class="hidden sm:block h-8 w-px bg-slate-800"></div>

      <!-- Network / Connection indicator -->
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span class="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
          Online
        </span>
      </div>

      <!-- Slots for extra custom actions -->
      <slot name="actions"></slot>

      <!-- Notification Bell -->
      <button class="relative p-2 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/40 text-slate-400 hover:text-cyan-400 transition cursor-pointer select-none">
        <Bell class="w-4.5 h-4.5" />
        <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 animate-bounce"></span>
      </button>

      <!-- Divider -->
      <div class="h-8 w-px bg-slate-800"></div>

      <!-- Profile Avatar -->
      <div class="flex items-center gap-2">
        <div class="relative w-9 h-9 rounded-xl overflow-hidden border border-cyan-500/30 hover:border-cyan-400 transition shadow-[0_0_10px_rgba(6,182,212,0.1)] p-[1px]">
          <div class="w-full h-full rounded-lg bg-gradient-to-br from-indigo-950 to-slate-900 flex items-center justify-center text-xs font-black text-cyan-400 uppercase select-none">
            AD
          </div>
        </div>
        <div class="hidden md:flex flex-col text-left">
          <span class="text-xs font-black text-slate-200 tracking-wider">Admin Twin</span>
          <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-0.5"><Shield class="w-2.5 h-2.5 text-cyan-500" /> Root User</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
header {
  border-image: linear-gradient(to right, rgba(6,182,212,0), rgba(6,182,212,0.25) 50%, rgba(6,182,212,0)) 1;
}
</style>
