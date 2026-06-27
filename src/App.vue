<script setup lang="ts">
import { ref, provide } from "vue";
import Header from "./components/layout/Header.vue";
import Footer from "./components/layout/Footer.vue";
import Body from "./components/Body.vue";
import { translations } from "./utils/translations";
import { useParkingRealtime } from "./composables/useParkingRealtime";

const { isConnected, mqttConnected } = useParkingRealtime();

const isDark = ref(true);
const toggleTheme = () => {
  isDark.value = !isDark.value;
};

const locale = ref("vi"); // Mặc định là Tiếng Việt như yêu cầu
const toggleLocale = () => {
  locale.value = locale.value === "vi" ? "en" : "vi";
};

const t = (key: string): string => {
  return translations[locale.value]?.[key] ?? translations["vi"]?.[key] ?? key;
};

// Cung cấp các biến theme và ngôn ngữ cho toàn bộ các component con
provide("isDark", isDark);
provide("toggleTheme", toggleTheme);
provide("locale", locale);
provide("toggleLocale", toggleLocale);
provide("t", t);
provide("isConnected", isConnected);
provide("mqttConnected", mqttConnected);

const lastAction = ref("Chưa có hành động");
const handleRefresh = () => {
  lastAction.value = t("telemetry_reset_action") + new Date().toLocaleTimeString();
};

</script>

<template>
  <div
    class="min-h-screen flex flex-col font-sans select-none overflow-hidden transition-colors duration-300"
    :class="isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'"
  >
    <Header>
      <!-- <template #actions>
        <button
          @click="handleRefresh"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer select-none transition shadow-md active:scale-95"
          :class="isDark 
            ? 'bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
            : 'bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-600 shadow-[0_2px_8px_rgba(6,182,212,0.08)]'"
        >
          <i class="pi pi-refresh text-[10px] animate-spin" style="animation-duration: 4s"></i> {{ t('telemetry_reset') }}
        </button>
      </template> -->
    </Header>
    <Body />
    <Footer />
  </div>
</template>


<style scoped>
/* Xóa hoặc giữ lại các biến màu nếu cần dùng cho các component khác */
:root {
  --page-bg: #0d1724;
  --panel-bg: rgba(12, 18, 34, 0.94);
  --panel-border: rgba(255, 255, 255, 0.08);
  --text-main: #e6eef7;
  --text-muted: #9fb1c7;
}
</style>
