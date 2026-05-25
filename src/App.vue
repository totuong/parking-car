<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import Header from "./components/layout/Header.vue";
import Footer from "./components/layout/Footer.vue";
import Body from "./components/Body.vue";

const lastAction = ref("Chưa có hành động");
const handleRefresh = () => {
  lastAction.value = "Đã nhấn refresh vào " + new Date().toLocaleTimeString();
};

</script>

<template>
  <div
    class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden"
  >
    <Header>
      <template #actions>
        <button
          @click="handleRefresh"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/30 hover:border-cyan-400 text-xs font-bold text-cyan-400 cursor-pointer select-none transition shadow-[0_0_15px_rgba(6,182,212,0.1)] active:scale-95"
        >
          <i class="pi pi-refresh text-[10px] animate-spin" style="animation-duration: 4s"></i> Telemetry Reset
        </button>
      </template>
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
