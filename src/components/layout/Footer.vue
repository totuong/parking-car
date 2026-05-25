<template>
  <footer class="px-6 py-4 border-t border-slate-900 bg-slate-950/90 text-slate-500 text-xs flex flex-wrap items-center justify-between gap-4 select-none">
    <!-- Left Section -->
    <div class="flex items-center gap-2.5">
      <span class="font-bold text-slate-400">© 2026 PARKING TWIN</span>
      <span class="text-slate-800">|</span>
      <span class="text-[10px] tracking-widest font-black text-cyan-500/80 uppercase">AI-INTEGRATED SMART PARKING</span>
    </div>

    <!-- Center Section -->
    <div class="hidden md:flex items-center gap-6 font-mono text-[10px] uppercase text-slate-400">
      <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span><span>Digital Twin Sync: Real-time</span></div>
      <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span><span>Latency: &lt;12ms</span></div>
      <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span><span>GPU Accel: WebGL 3D</span></div>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-3 text-[10px] font-bold text-slate-400">
      <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-cyan-400">ENGINE v1.8.4</span>
      <span class="hidden sm:inline text-slate-500 font-semibold italic">University Presentation Showcase</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
// No logic needed for static footer
</script>

<style scoped>
footer {
  border-image: linear-gradient(to right, rgba(6,182,212,0), rgba(6,182,212,0.15) 50%, rgba(6,182,212,0)) 1;
}
</style>
