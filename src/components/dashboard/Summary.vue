<template>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- Total Slots -->
        <div class="relative overflow-hidden rounded-xl border p-5 backdrop-blur-md shadow-lg group transition duration-300"
            :class="isDark
                ? 'border-slate-800 bg-slate-950/60 hover:border-cyan-500/30'
                : 'border-slate-200 bg-white/70 hover:border-cyan-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-bold uppercase tracking-wider"
                        :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('total_slots') }}</p>
                    <h3 class="text-2xl font-black font-mono mt-1"
                        :class="isDark ? 'text-slate-100' : 'text-slate-800'">40</h3>
                </div>
                <div class="p-3 rounded-lg group-hover:scale-110 transition duration-300" :class="isDark
                    ? 'bg-cyan-950/50 border border-cyan-500/20 text-cyan-400'
                    : 'bg-cyan-50 border border-cyan-200 text-cyan-600'">
                    <Compass class="w-5 h-5" />
                </div>
            </div>
            <div class="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase"
                :class="isDark ? 'text-slate-500' : 'text-slate-400'">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 inline animate-pulse" /> {{ t('dual_deck') }}
            </div>
            <!-- Pulse effect line -->
            <span
                class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></span>
        </div>

        <!-- Occupied Slots -->
        <div class="relative overflow-hidden rounded-xl border p-5 backdrop-blur-md shadow-lg group transition duration-300"
            :class="isDark
                ? 'border-slate-800 bg-slate-950/60 hover:border-orange-500/30'
                : 'border-slate-200 bg-white/70 hover:border-orange-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-bold uppercase tracking-wider"
                        :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('occupied_slots') }}</p>
                    <h3 class="text-2xl font-black font-mono text-orange-500 mt-1 animate-pulse">{{ occupiedCount }}
                    </h3>
                </div>
                <div class="p-3 rounded-lg group-hover:scale-110 transition duration-300" :class="isDark
                    ? 'bg-orange-950/50 border border-orange-500/20 text-orange-400'
                    : 'bg-orange-50 border border-orange-200 text-orange-600'">
                    <Car class="w-5 h-5" />
                </div>
            </div>
            <div class="mt-3 flex items-center gap-1.5 text-[10px]">
                <span class="w-2 h-2 rounded-full bg-orange-500 inline-block animate-ping"></span>
                <span class="font-semibold uppercase" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{
                    t('realtime_synced') }}</span>
            </div>
            <span
                class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></span>
        </div>

        <!-- Occupancy Rate -->
        <div class="relative overflow-hidden rounded-xl border p-5 backdrop-blur-md shadow-lg group transition duration-300"
            :class="isDark
                ? 'border-slate-800 bg-slate-950/60 hover:border-indigo-500/30'
                : 'border-slate-200 bg-white/70 hover:border-indigo-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-bold uppercase tracking-wider"
                        :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('occupancy_rate') }}</p>
                    <h3 class="text-2xl font-black font-mono text-indigo-500 mt-1">{{ occupancyRate }}%</h3>
                </div>
                <div class="p-3 rounded-lg group-hover:scale-110 transition duration-300" :class="isDark
                    ? 'bg-indigo-950/50 border border-indigo-500/20 text-indigo-400'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600'">
                    <Activity class="w-5 h-5" />
                </div>
            </div>
            <!-- Simple progress bar -->
            <div class="mt-4.5 w-full rounded-full h-1.5 overflow-hidden"
                :class="isDark ? 'bg-slate-900' : 'bg-slate-100'">
                <div class="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    :style="{ width: `${occupancyRate}%` }"></div>
            </div>
            <span
                class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></span>
        </div>

        <!-- Alerts count -->
        <div class="relative overflow-hidden rounded-xl border p-5 backdrop-blur-md shadow-lg group transition duration-300"
            :class="isDark
                ? 'border-slate-800 bg-slate-950/60 hover:border-red-500/30'
                : 'border-slate-200 bg-white/70 hover:border-red-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-bold uppercase tracking-wider"
                        :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ t('active_alerts') }}</p>
                    <h3 class="text-2xl font-black font-mono text-red-500 mt-1"
                        :class="{ 'animate-bounce': alertCount > 0 }">{{ alertCount }}</h3>
                </div>
                <div class="p-3 rounded-lg group-hover:scale-110 transition duration-300" :class="isDark
                    ? 'bg-red-950/50 border border-red-500/20 text-red-500'
                    : 'bg-red-50 border border-red-200 text-red-600'">
                    <ShieldAlert class="w-5 h-5" />
                </div>
            </div>
            <div class="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase"
                :class="isDark ? 'text-slate-500' : 'text-slate-400'">
                <AlertTriangle class="w-3.5 h-3.5 text-red-500 inline animate-pulse" /> {{ t('security_stable') }}
            </div>
            <span
                class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></span>
        </div>
    </div>
</template>
<script>
export default {

}
</script>
<style lang="">

</style>