<template>
    <aside class="relative flex flex-col py-6 border-r transition-all duration-300 z-30 select-none" :class="[
        isCollapsed ? 'w-20 px-2' : 'w-64 px-4',
        isDark
            ? 'border-slate-900 bg-slate-950/80 backdrop-blur-md'
            : 'border-slate-200 bg-white/80 backdrop-blur-md shadow-[2px_0_15px_rgba(0,0,0,0.01)]'
    ]">
        <!-- Navigation Header -->
        <div class="flex items-center mb-6" :class="isCollapsed ? 'justify-center' : 'justify-between px-2'">
            <span v-if="!isCollapsed"
                class="text-[10px] font-black tracking-widest uppercase transition-colors duration-300"
                :class="isDark ? 'text-slate-500' : 'text-slate-400'">
                {{ t('nav_nodes') }}
            </span>
            <button @click="toggleSidebar" class="p-1.5 rounded-lg border transition cursor-pointer" :class="isDark
                ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-cyan-600 hover:border-cyan-500/40'"
                :title="isCollapsed ? t('nav_expand') : t('nav_collapse')">
                <ChevronRight v-if="isCollapsed" class="w-4 h-4" />
                <ChevronLeft v-else class="w-4 h-4" />
            </button>
        </div>

        <!-- Navigation list items -->
        <nav class="flex-1 flex flex-col gap-1.5">
            <button v-for="item in navItems" :key="item.key"
                class="relative flex items-center rounded-xl transition duration-205 outline-none text-left cursor-pointer group"
                :class="[
                    isCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3',
                    currentTab === item.key
                        ? (isDark
                            ? 'bg-cyan-500/10 text-cyan-400 font-extrabold border border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.06)]'
                            : 'bg-cyan-500/10 text-cyan-600 font-extrabold border border-cyan-500/20 shadow-sm')
                        : (isDark
                            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent')
                ]" @click="setTab(item.key)" :title="t('nav_' + item.key)">
                <!-- Active glowing node dot indicator -->
                <span v-if="currentTab === item.key"
                    class="absolute left-0 w-[3px] h-1/2 rounded-r transition-all duration-300"
                    :class="isDark ? 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]' : 'bg-cyan-500'"></span>

                <!-- Lucide Icon -->
                <component :is="item.icon" class="w-5 h-5 transition duration-200"
                    :class="currentTab === item.key
                        ? (isDark ? 'text-cyan-400' : 'text-cyan-600')
                        : (isDark ? 'text-slate-400 group-hover:text-cyan-400' : 'text-slate-550 text-slate-500 group-hover:text-cyan-600')" />

                <!-- Label text -->
                <span v-if="!isCollapsed" class="text-xs tracking-wider uppercase font-semibold">
                    {{ t('nav_' + item.key) }}
                </span>

                <!-- Offline status label for placeholder items -->
                <span v-if="!isCollapsed && item.offline"
                    class="ml-auto text-[7px] font-black tracking-widest uppercase px-1 py-0.2 rounded border scale-90 transition-all duration-300"
                    :class="isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-600'
                        : 'bg-slate-100 border-slate-200 text-slate-400'">
                    Offline
                </span>
            </button>
        </nav>

        <!-- Sidebar footer block -->
        <div v-if="!isCollapsed"
            class="border-t pt-4 px-2 flex items-center gap-2 text-[10px] uppercase font-mono font-bold tracking-wider transition-colors duration-300"
            :class="isDark ? 'border-slate-900/80 text-slate-550 text-slate-500' : 'border-slate-200 text-slate-400'">
            <Radio class="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            <span>{{ t('telemetry_core_up') }}</span>
        </div>
    </aside>
</template>
<script setup lang="ts">
import { inject } from "vue"
import {
    LayoutDashboard, Eye, BarChart3, FileText, Camera, Map, Settings,
    ChevronLeft, ChevronRight, HelpCircle, History, Radio
} from 'lucide-vue-next'

const props = defineProps<{ currentTab: string; isCollapsed: boolean }>()
const emit = defineEmits<{
  (event: 'update:currentTab', value: string): void
  (event: 'toggleSidebar'): void
}>()

const isDark = inject<any>('isDark')
const t = inject<any>('t')

const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "monitoring", label: "Realtime Monitoring", icon: Eye, offline: true },
    { key: "analytics", label: "Analytics", icon: BarChart3, offline: true },
    { key: "reports", label: "Reports", icon: FileText, offline: true },
    { key: "camera", label: "Camera System", icon: Camera, offline: true },
    { key: "zones", label: "Parking Zones", icon: Map, offline: true },
    { key: "settings", label: "Settings", icon: Settings, offline: true },
    { key: "guide", label: "Guide & Docs", icon: HelpCircle },
    { key: "history", label: "System History", icon: History },
]

function toggleSidebar() {
    emit('toggleSidebar')
}

function setTab(key: string) {
    emit('update:currentTab', key)
}
</script>
<style lang="">

</style>