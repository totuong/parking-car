<script setup lang="ts">
import { ref, provide, onMounted } from "vue";
import Header from "./components/layout/Header.vue";
import Footer from "./components/layout/Footer.vue";
import Body from "./components/Body.vue";
import Login from "./components/Login.vue";
import { translations } from "./utils/translations";
import { useParkingRealtime } from "./composables/useParkingRealtime";
import { getCookie, deleteCookie } from "./utils/cookie";
import { logoutApi } from "./utils/api";

const { isConnected, mqttConnected, disconnect, registerAuthErrorCallback } = useParkingRealtime();

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
const expiredNotice = ref<string>('');

onMounted(() => {
  authToken.value = getCookie('token');

  // Lắng nghe sự kiện lỗi Token/Hết hạn từ WebSocket
  registerAuthErrorCallback((reason) => {
    expiredNotice.value = reason || (locale.value === 'vi' 
      ? 'Phiên đăng nhập đã hết hạn hoặc kết nối không hợp lệ. Vui lòng đăng nhập lại!' 
      : 'Session expired or invalid connection. Please log in again!');
    handleLogout();
  });
});

const handleLoginSuccess = (token: string) => {
  authToken.value = token;
  expiredNotice.value = '';
};

const handleLogout = async () => {
  const currentToken = authToken.value || getCookie('token');
  if (currentToken) {
    try {
      await logoutApi(currentToken);
    } catch (e) {
      console.warn('Lỗi khi gọi API logout:', e);
    }
  }
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
    <div v-if="!authToken" class="flex-1 flex items-center justify-center bg-slate-950 p-4">
      <Login :expired-notice="expiredNotice" @login-success="handleLoginSuccess" />
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
