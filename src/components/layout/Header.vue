<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, inject } from 'vue'
import { Activity, Bell, Shield, Cpu, Sun, Moon } from 'lucide-vue-next'
import { Icon } from '@iconify/vue';

const isDark = inject<any>('isDark')
const toggleTheme = inject<any>('toggleTheme')
const locale = inject<any>('locale')
const toggleLocale = inject<any>('toggleLocale')
const t = inject<any>('t')

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
  <header 
    class="sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b backdrop-blur-md transition-all duration-300"
    :class="isDark 
      ? 'border-cyan-500/20 bg-slate-950/80 shadow-[0_4px_30px_rgba(0,243,255,0.03)]' 
      : 'border-slate-200 bg-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'"
  >
    <!-- Brand / Logo -->
    <div class="flex items-center gap-3 select-none">
      <div 
        class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br transition-all duration-300"
        :class="isDark 
          ? 'from-cyan-500 to-indigo-600 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse' 
          : 'from-cyan-600 to-indigo-500 shadow-[0_2px_10px_rgba(6,182,212,0.25)]'"
      >
        <Cpu class="w-5 h-5 text-white" />
        <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900"></span>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 
            class="text-xl font-extrabold tracking-wider text-transparent bg-clip-text uppercase transition-all duration-300"
            :class="isDark 
              ? 'bg-gradient-to-r from-cyan-400 via-indigo-200 to-white drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
              : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-slate-800'"
          >
            {{ t('app_title') }}
          </h1>
          <!-- <span 
            class="px-1.5 py-0.5 text-[9px] font-black tracking-widest rounded uppercase transition-colors duration-300"
            :class="isDark 
              ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-500/30' 
              : 'text-cyan-600 bg-cyan-50 border-cyan-200'"
          >
            v1.0.0
          </span> -->
        </div>
        <p 
          class="text-[10px] font-medium tracking-wide uppercase mt-0.5 flex items-center gap-1.5 transition-colors duration-300"
          :class="isDark ? 'text-slate-400' : 'text-slate-500'"
        >
          <Activity class="w-3 h-3 text-cyan-500 inline" /> {{ t('app_subtitle') }}
        </p>
      </div>
    </div>

    <!-- Actions / Ticker / System Info -->
    <div class="flex items-center gap-6">
      <!-- Live Clock -->
      <div class="hidden sm:flex flex-col items-end font-mono">
        <span class="text-xs font-bold uppercase tracking-wider" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('system_clock') }}</span>
        <span 
          class="text-sm font-extrabold transition-all duration-300"
          :class="isDark ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]' : 'text-cyan-600'"
        >
          {{ clock.toLocaleDateString() }} - {{ clock.toLocaleTimeString() }}
        </span>
      </div>

      <!-- Divider -->
      <div class="hidden sm:block h-8 w-px transition-colors duration-300" :class="isDark ? 'bg-slate-800' : 'bg-slate-200'"></div>

      <!-- Network / Connection indicator -->
      <div 
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300"
        :class="isDark 
          ? 'bg-emerald-950/30 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]' 
          : 'bg-emerald-50 border-emerald-200'"
      >
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span class="text-[10px] font-black tracking-widest text-emerald-500 uppercase">
          {{ t('online') }}
        </span>
      </div>

      <!-- Divider -->
      <div class="hidden sm:block h-8 w-px transition-colors duration-300" :class="isDark ? 'bg-slate-800' : 'bg-slate-200'"></div>

      <!-- Theme Switcher -->
      <button 
        @click="toggleTheme"
        class="relative p-2 rounded-xl border transition-all duration-300 cursor-pointer select-none outline-none group active:scale-95 shadow-sm"
        :class="isDark 
          ? 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/40 text-slate-400 hover:text-cyan-400' 
          : 'bg-white border-slate-200 hover:border-cyan-500/40 hover:bg-cyan-50/20 text-slate-600 hover:text-cyan-600'"
        :title="isDark ? t('switch_light') : t('switch_dark')"
      >
        <component 
          :is="isDark ? Sun : Moon" 
          class="w-4.5 h-4.5 transition-transform duration-500 group-hover:rotate-45"
          :class="isDark ? 'text-amber-400' : 'text-indigo-600'"
        />
      </button>

      <!-- Language Switcher (EN / VI) -->
      <!-- <button 
        @click="toggleLocale"
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold select-none cursor-pointer active:scale-95 transition-all duration-300 shadow-sm"
        :class="isDark 
          ? 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/40 text-slate-300 hover:text-cyan-400' 
          : 'bg-white border-slate-200 hover:border-cyan-500/40 hover:bg-cyan-50/20 text-slate-600 hover:text-cyan-600'"
        :title="locale === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'"
      >
        <span class="text-xs leading-none">{{ locale === 'vi' ? '🇬🇧' : '🇻🇳' }}</span>
        <span class="text-[9px] uppercase tracking-wider font-extrabold ml-1">{{ locale === 'vi' ? 'EN' : 'VI' }}</span>
      </button> -->

        <button @click="toggleLocale"
        class="p-1 ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :title="locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'">
        <Icon :icon="locale === 'vi' ? 'flag:vn-4x3' : 'flag:us-4x3'" class="w-6 h-6 rounded-sm shadow-sm" />
      </button>
      <!-- Slots for extra custom actions -->
      <!-- <slot name="actions"></slot> -->

      <!-- Notification Bell -->
      <button 
        class="relative p-2 rounded-xl border transition-all duration-300 cursor-pointer select-none"
        :class="isDark 
          ? 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/40 text-slate-400 hover:text-cyan-400' 
          : 'bg-white border-slate-200 hover:border-cyan-500/30 hover:bg-slate-50 text-slate-500 hover:text-cyan-600'"
      >
        <Bell class="w-4.5 h-4.5" />
        <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 animate-bounce"></span>
      </button>

      <!-- Divider -->
      <div class="h-8 w-px transition-colors duration-300" :class="isDark ? 'bg-slate-800' : 'bg-slate-200'"></div>

      <!-- Profile Avatar -->
      <div class="flex items-center gap-2">
        <div 
          class="relative w-9 h-9 rounded-xl overflow-hidden border p-[1px] transition-all duration-300"
          :class="isDark ? 'border-cyan-500/30 hover:border-cyan-400' : 'border-slate-200 hover:border-cyan-500'"
        >
          <div 
            class="w-full h-full rounded-lg flex items-center justify-center text-xs font-black uppercase select-none transition-all duration-300"
            :class="isDark ? 'bg-gradient-to-br from-indigo-950 to-slate-900 text-cyan-400' : 'bg-gradient-to-br from-slate-100 to-white text-cyan-600 border border-slate-200'"
          >
            AD
          </div>
        </div>
        <div class="hidden md:flex flex-col text-left">
          <span class="text-xs font-black transition-all duration-300" :class="isDark ? 'text-slate-200' : 'text-slate-700'">Admin Twin</span>
          <span class="text-[9px] font-bold uppercase tracking-widest flex items-center gap-0.5" :class="isDark ? 'text-slate-500' : 'text-slate-400'">
            <Shield class="w-2.5 h-2.5 text-cyan-500" /> {{ t('root_user') }}
          </span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
header {
  border-image: linear-gradient(to right, rgba(6,182,212,0), rgba(6,182,212,0.2) 50%, rgba(6,182,212,0)) 1;
}
</style>


