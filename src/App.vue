<script setup lang="ts">
import { ref, provide, onMounted } from "vue";
import Header from "./components/layout/Header.vue";
import Footer from "./components/layout/Footer.vue";
import Body from "./components/Body.vue";
import Login from "./components/Login.vue";
import { translations } from "./utils/translations";
import { useParkingRealtime } from "./composables/useParkingRealtime";
import { getCookie, deleteCookie } from "./utils/cookie";

const { isConnected, mqttConnected, disconnect } = useParkingRealtime();

const isDark = ref(false);
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

const authToken = ref<string | null>(null);

onMounted(() => {
  authToken.value = getCookie('token');
});

const handleLoginSuccess = (token: string) => {
  authToken.value = token;
};

const handleLogout = () => {
  deleteCookie('token');
  authToken.value = null;
  disconnect();
};

// Cung cấp các biến theme và ngôn ngữ cho toàn bộ các component con
provide("isDark", isDark);
provide("toggleTheme", toggleTheme);
provide("locale", locale);
provide("toggleLocale", toggleLocale);
provide("t", t);
provide("isConnected", isConnected);
provide("mqttConnected", mqttConnected);
provide("authToken", authToken);
provide("logout", handleLogout);

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
    <div v-if="!authToken" class="flex-1 flex items-center justify-center bg-slate-950">
      <Login @login-success="handleLoginSuccess" />
    </div>
    <template v-else>
      <Header />
      <Body />
      <Footer />
    </template>
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
