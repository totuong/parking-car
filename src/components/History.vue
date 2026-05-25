<script setup lang="ts">
import { History, Activity, ShieldAlert, Cpu } from 'lucide-vue-next'

const systemMilestones = [
  { time: '2026-05-24 19:00:00', title: 'Telemetry Node Calibrated', status: 'SUCCESS', desc: 'Main digital twin render engine initialized on WebGL core.' },
  { time: '2026-05-24 16:30:15', title: 'CCTV Channel 01-04 Setup', status: 'ONLINE', desc: 'Visual recognition streams routed successfully with latency filters.' },
  { time: '2026-05-24 12:00:00', title: 'Database Cold Synchronization', status: 'SYNCED', desc: 'Space occupancy vectors synced with central Smart City storage node.' },
  { time: '2026-05-23 09:15:30', title: 'EV Fast Charging Modules Active', status: 'HEALTHY', desc: '120kW smart power grid handshake verified across Row C.' },
  { time: '2026-05-22 14:00:00', title: 'Core Interface Alpha Deployment', status: 'DEPLOYED', desc: 'Initial system shell mounted on Vue 3 + Tailwind CSS runtime.' },
]
</script>

<template>
  <div class="flex flex-col gap-6 text-slate-200">
    <div class="border-b border-slate-900 pb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-black tracking-widest text-cyan-400 uppercase flex items-center gap-2">
          <History class="w-6 h-6" /> System Activity Log History
        </h2>
        <p class="text-xs text-slate-500 mt-1 uppercase tracking-wider font-mono">Archive Logs & Deployment Milestones</p>
      </div>
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20">
        <Activity class="w-3.5 h-3.5 text-indigo-400" />
        <span class="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-widest">
          Uptime: 99.98%
        </span>
      </div>
    </div>

    <!-- Timeline Layout -->
    <div class="rounded-2xl border border-slate-900 bg-slate-950/60 p-6 backdrop-blur-md shadow-lg flex flex-col gap-6">
      
      <div class="relative pl-6 border-l border-slate-850 flex flex-col gap-8">
        <div 
          v-for="(mile, idx) in systemMilestones" 
          :key="idx" 
          class="relative flex flex-col gap-1.5"
        >
          <!-- Bullet dot with neon glow -->
          <span class="absolute -left-[30px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border border-cyan-500/50 flex items-center justify-center">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
          </span>

          <div class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-[10px] text-slate-500 font-bold">{{ mile.time }}</span>
            <span class="text-xs font-black uppercase text-slate-200 tracking-wide">{{ mile.title }}</span>
            
            <span class="px-1.5 py-0.2 rounded font-mono font-black text-[8px] tracking-wider uppercase bg-slate-900 border border-slate-800 text-cyan-400">
              {{ mile.status }}
            </span>
          </div>

          <p class="text-xs text-slate-400 leading-relaxed max-w-2xl bg-slate-900/20 p-3 rounded-lg border border-slate-900/50 mt-1">
            {{ mile.desc }}
          </p>
        </div>
      </div>

      <!-- Footer system health info -->
      <div class="border-t border-slate-900 pt-6 flex items-center gap-3 bg-slate-900/10 p-4 rounded-xl border border-slate-900/50 mt-4 text-[11px] text-slate-400 font-medium">
        <Cpu class="w-5 h-5 text-cyan-500 shrink-0" />
        <p class="leading-relaxed">
          Historical registers are locked under cryptographically signed administrator profiles. Any manual overrides performed in the current session are appended to the runtime telemetry buffer and saved in volatile storage.
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Timeline indicators */
</style>
