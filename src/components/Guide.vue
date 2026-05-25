<script setup lang="ts">
import { BookOpen, Compass, Eye, ShieldAlert, Cpu, ArrowRight } from 'lucide-vue-next'
</script>

<template>
  <div class="flex flex-col gap-6 text-slate-200">
    <div class="border-b border-slate-900 pb-4">
      <h2 class="text-xl font-black tracking-widest text-cyan-400 uppercase flex items-center gap-2">
        <BookOpen class="w-6 h-6" /> Platform Operations Guide
      </h2>
      <p class="text-xs text-slate-500 mt-1 uppercase tracking-wider font-mono">Operations Manual & System Documentation</p>
    </div>

    <!-- Operations content grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 3D Digital Twin Panel -->
      <div class="rounded-2xl border border-slate-900 bg-slate-950/60 p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
        <h3 class="text-sm font-black text-cyan-400 uppercase flex items-center gap-2 border-b border-slate-900 pb-2">
          <Compass class="w-5 h-5 text-indigo-400" /> 1. 3D Digital Twin Space Operations
        </h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          The central WebGL view renders a high-precision, real-time virtual replica of the parking facility.
        </p>
        <ul class="text-[11px] text-slate-400 flex flex-col gap-2.5 bg-slate-900/30 p-4 rounded-xl border border-slate-900/50">
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" /> <span><strong>Rotations:</strong> Click and drag the left mouse button to orbit the camera target.</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" /> <span><strong>Panning:</strong> Drag the right mouse button to shift the camera focus center.</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" /> <span><strong>Zooming:</strong> Scroll the mouse wheel to adjust distance magnification (10m to 60m bounds).</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" /> <span><strong>Presets:</strong> Use top-left perspective controls to reset camera to Isometric, Top-down, or Entrance view.</span></li>
        </ul>
      </div>

      <!-- Live Monitoring Sensors -->
      <div class="rounded-2xl border border-slate-900 bg-slate-950/60 p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
        <h3 class="text-sm font-black text-cyan-400 uppercase flex items-center gap-2 border-b border-slate-900 pb-2">
          <Eye class="w-5 h-5 text-emerald-400" /> 2. Space Telemetry & CCTV
        </h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          The platform incorporates real-time slot telemetry analysis and live simulated CCTV feeds.
        </p>
        <ul class="text-[11px] text-slate-400 flex flex-col gap-2.5 bg-slate-900/30 p-4 rounded-xl border border-slate-900/50">
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" /> <span><strong>Telemetry Hover:</strong> Place the cursor over slots to inspect active sensor payloads instantly.</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" /> <span><strong>Inspector Select:</strong> Click on a slot to lock the telemetry analyzer onto that node.</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" /> <span><strong>CCTV Overlay:</strong> CCTV Feeds feature animated overlay grids and scanlines to mimic real-world video encoding.</span></li>
          <li class="flex items-start gap-2"><ArrowRight class="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" /> <span><strong>Simulator Engine:</strong> Toggle the auto-simulation at the top right to control the dynamic traffic influx/outflux.</span></li>
        </ul>
      </div>

      <!-- EV Fast Charging & Smart Grid -->
      <div class="rounded-2xl border border-slate-900 bg-slate-950/60 p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
        <h3 class="text-sm font-black text-cyan-400 uppercase flex items-center gap-2 border-b border-slate-900 pb-2">
          <Cpu class="w-5 h-5 text-indigo-400" /> 3. EV Charging Infrastructure
        </h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          Integrated EV Fast charging monitoring allows real-time grid tracking.
        </p>
        <div class="text-[11px] text-slate-400 flex items-start gap-3 bg-slate-900/30 p-4 rounded-xl border border-slate-900/50">
          <ShieldAlert class="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <p class="leading-relaxed">
            When an electric vehicle (EV) parks in a designated slot, the system automatically engages the simulated fast-charging protocol (active visual progress telemetry), logging charge statuses into the main activity timeline.
          </p>
        </div>
      </div>

      <!-- Architecture and WebSockets -->
      <div class="rounded-2xl border border-slate-900 bg-slate-950/60 p-6 backdrop-blur-md shadow-lg flex flex-col gap-4">
        <h3 class="text-sm font-black text-cyan-400 uppercase flex items-center gap-2 border-b border-slate-900 pb-2">
          <Cpu class="w-5 h-5 text-cyan-400" /> 4. Enterprise Architecture & Integration
        </h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          Prepare the dashboard layout for industrial enterprise deployment.
        </p>
        <div class="text-[11px] text-slate-400 flex items-start gap-3 bg-slate-900/30 p-4 rounded-xl border border-slate-900/50">
          <Cpu class="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <p class="leading-relaxed font-mono">
            The telemetry modules accept socket integrations. The `applyRealtimeMessage` handler in the source receives raw payloads, enabling production-ready WebSocket feeds with minimal modification.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom doc aesthetics */
</style>
