<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Slot {
  id: string
  occupied: boolean
  carType?: string
  carColor?: string
  timestamp?: number
}

const props = defineProps<{ slot: Slot }>()

const statusClass = computed(() => (props.slot.occupied ? 'occupied' : 'free'))
const label = computed(() => props.slot.occupied ? props.slot.carType ?? 'Car' : 'Free')

// map some common color names to hex to ensure good contrast
const colorMap: Record<string,string> = {
  black: '#0f172a',
  white: '#f8fafc',
  red: '#ef4444',
  blue: '#2563eb',
  green: '#10b981',
  yellow: '#f59e0b',
  silver: '#94a3b8',
  gray: '#6b7280'
}

const carFill = computed(() => {
  const c = props.slot.carColor?.toString() || ''
  const key = c.toLowerCase()
  if (!c) return '#374151'
  return colorMap[key] ?? key
})

// pulse when this slot's timestamp updates
const updated = ref(false)
watch(() => props.slot.timestamp, (v) => {
  if (v) {
    updated.value = true
    setTimeout(() => (updated.value = false), 700)
  }
})
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 px-2 py-3 min-w-[96px] rounded-xl transition-transform duration-150 shadow group focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2"
    :class="[statusClass, { 'scale-105 ring-2 ring-blue-400/40': updated, 'bg-gradient-to-b from-emerald-50/80 to-emerald-100/60 border-2 border-emerald-400/80': statusClass==='free', 'bg-gradient-to-b from-slate-200/80 to-slate-100/60 border border-slate-300': statusClass==='occupied' }]"
    :data-id="props.slot.id"
    tabindex="0"
  >
    <div class="font-bold text-xs text-slate-500 group-[.occupied]:text-slate-700">{{ props.slot.id }}</div>
    <div
      class="flex items-center justify-center rounded-lg transition-all duration-200 outline-none"
      :class="[statusClass==='free' ? 'border-2 border-emerald-400/80 bg-gradient-to-b from-emerald-50 to-emerald-100' : 'border border-slate-300 bg-gradient-to-b from-slate-200 to-slate-100', updated ? 'ring-2 ring-blue-400/40 scale-105 shadow-lg' : '']"
      style="width:44px;height:80px;"
      :title="props.slot.occupied ? (props.slot.carType + ' · ' + (props.slot.carColor || 'Unknown')) : 'Free'"
    >
      <svg v-if="props.slot.occupied" viewBox="0 0 22 44" class="w-11 h-20 car-svg" aria-hidden="true" style="display:block">
        <!-- Thân xe -->
        <path d="M3 4 L19 4 Q21 8 21 40 L3 40 Q1 36 1 8 Z" :fill="carFill" />
        <!-- Kính xe -->
        <rect x="6" y="8" width="10" height="12" rx="2" fill="#e0e7ef" fill-opacity="0.7" />
        <!-- Bánh xe -->
        <ellipse cx="6" cy="7" rx="2" ry="1.2" fill="#222" />
        <ellipse cx="16" cy="7" rx="2" ry="1.2" fill="#222" />
        <ellipse cx="6" cy="37" rx="2" ry="1.2" fill="#222" />
        <ellipse cx="16" cy="37" rx="2" ry="1.2" fill="#222" />
      </svg>
    </div>
    <div class="text-center">
      <div class="text-xs font-semibold text-slate-700 group-[.free]:text-emerald-700">{{ label }}</div>
      <div v-if="props.slot.timestamp" class="text-[10px] text-slate-400">{{ new Date(props.slot.timestamp).toLocaleTimeString() }}</div>
    </div>
  </div>
</template>

<style scoped>
/* Có thể giữ lại các biến màu cho logic hoặc animation, phần layout đã chuyển sang Tailwind */
</style>
