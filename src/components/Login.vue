<script setup lang="ts">
import { ref, inject } from 'vue'
import { getCookie, setCookie } from '../utils/cookie'
import { User, Lock, Cpu, Eye, EyeOff, Loader2 } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'login-success', token: string): void
}>()

const isDark = inject<any>('isDark')
const t = inject<any>('t')
const locale = inject<any>('locale')

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = locale.value === 'vi' 
      ? 'Vui lòng nhập tên đăng nhập và mật khẩu!' 
      : 'Please enter username and password!'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch('http://localhost:8080/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })

    if (!res.ok) {
      throw new Error(locale.value === 'vi' 
        ? 'Tên đăng nhập hoặc mật khẩu không chính xác!' 
        : 'Incorrect username or password!')
    }

    const data = await res.json()
    if (data && data.token) {
      // Save token in cookie for 7 days
      setCookie('token', data.token, 7)
      emit('login-success', data.token)
    } else {
      throw new Error(locale.value === 'vi' 
        ? 'Phản hồi từ server không hợp lệ!' 
        : 'Invalid server response!')
    }
  } catch (error: any) {
    console.error('Login error:', error)
    errorMessage.value = error.message || (locale.value === 'vi' 
      ? 'Lỗi kết nối đến server!' 
      : 'Server connection error!')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div 
    class="relative w-full max-w-md p-8 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 group"
    :class="isDark 
      ? 'border-cyan-500/20 bg-slate-950/90 shadow-cyan-950/30 text-slate-100' 
      : 'border-slate-200 bg-white/95 shadow-[0_10px_50px_rgba(0,0,0,0.08)] text-slate-800'"
  >
    <!-- Background glowing ambient spots -->
    <div 
      v-if="isDark"
      class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-cyan-500/10 filter blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"
    />
    <div 
      v-if="isDark"
      class="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-indigo-500/10 filter blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"
    />

    <!-- Header / Brand -->
    <div class="flex flex-col items-center mb-8 text-center">
      <div 
        class="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br mb-4 transition-all duration-300 shadow-lg"
        :class="isDark 
          ? 'from-cyan-500 to-indigo-600 shadow-cyan-500/20' 
          : 'from-cyan-600 to-indigo-500'"
      >
        <Cpu class="w-7 h-7 text-white animate-pulse" />
        <span class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2" :class="isDark ? 'border-slate-950' : 'border-white'"></span>
      </div>
      
      <h2 
        class="text-2xl font-black tracking-wider text-transparent bg-clip-text uppercase"
        :class="isDark 
          ? 'bg-gradient-to-r from-cyan-400 via-indigo-200 to-white' 
          : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-slate-800'"
      >
        {{ locale === 'vi' ? 'Hệ Thống Bãi Xe 3D' : '3D Parking System' }}
      </h2>
      <p 
        class="text-xs uppercase font-semibold tracking-wider mt-1"
        :class="isDark ? 'text-slate-400' : 'text-slate-500'"
      >
        {{ locale === 'vi' ? 'Vui lòng đăng nhập để tiếp tục' : 'Please log in to continue' }}
      </p>
    </div>

    <!-- Error message Alert -->
    <div 
      v-if="errorMessage" 
      class="mb-6 p-4 rounded-xl border flex items-start gap-2.5 text-xs font-semibold animate-shake"
      :class="isDark 
        ? 'bg-red-950/30 border-red-500/30 text-red-400 shadow-inner' 
        : 'bg-red-50 border-red-200 text-red-600'"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse"></span>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Login Form -->
    <form @submit.prevent="handleLogin" class="flex flex-col gap-5">
      <!-- Username field -->
      <div class="flex flex-col gap-2">
        <label 
          class="text-xs font-bold uppercase tracking-wider text-left"
          :class="isDark ? 'text-slate-400' : 'text-slate-500'"
        >
          {{ locale === 'vi' ? 'Tên đăng nhập' : 'Username' }}
        </label>
        <div class="relative flex items-center">
          <span 
            class="absolute left-4.5"
            :class="isDark ? 'text-slate-500' : 'text-slate-400'"
          >
            <User class="w-4 h-4" />
          </span>
          <input 
            type="text" 
            v-model="username"
            :disabled="isLoading"
            class="w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-300 outline-none"
            :class="isDark 
              ? 'bg-slate-900/60 border-slate-800 text-slate-100 placeholder-slate-650 focus:border-cyan-500/50 focus:bg-slate-900/90 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500/60 focus:bg-white focus:shadow-[0_4px_20px_rgba(6,182,212,0.08)]'"
            :placeholder="locale === 'vi' ? 'Nhập tài khoản admin...' : 'Enter admin username...'"
          />
        </div>
      </div>

      <!-- Password field -->
      <div class="flex flex-col gap-2">
        <label 
          class="text-xs font-bold uppercase tracking-wider text-left"
          :class="isDark ? 'text-slate-400' : 'text-slate-500'"
        >
          {{ locale === 'vi' ? 'Mật khẩu' : 'Password' }}
        </label>
        <div class="relative flex items-center">
          <span 
            class="absolute left-4.5"
            :class="isDark ? 'text-slate-500' : 'text-slate-400'"
          >
            <Lock class="w-4 h-4" />
          </span>
          <input 
            :type="showPassword ? 'text' : 'password'" 
            v-model="password"
            :disabled="isLoading"
            class="w-full pl-11 pr-12 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-300 outline-none"
            :class="isDark 
              ? 'bg-slate-900/60 border-slate-800 text-slate-100 placeholder-slate-650 focus:border-cyan-500/50 focus:bg-slate-900/90 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500/60 focus:bg-white focus:shadow-[0_4px_20px_rgba(6,182,212,0.08)]'"
            :placeholder="locale === 'vi' ? 'Nhập mật khẩu...' : 'Enter password...'"
          />
          <button 
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-4.5 p-1 rounded hover:bg-slate-800/20 text-slate-400 hover:text-cyan-500 transition cursor-pointer select-none"
            :class="isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'"
          >
            <component :is="showPassword ? EyeOff : Eye" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Submit button -->
      <button 
        type="submit"
        :disabled="isLoading"
        class="w-full flex items-center justify-center gap-2 mt-2 px-6 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        :class="isDark ? 'shadow-cyan-500/10' : 'shadow-cyan-600/10'"
      >
        <Loader2 v-if="isLoading" class="w-4.5 h-4.5 animate-spin" />
        <span>{{ isLoading ? (locale === 'vi' ? 'Đang đăng nhập...' : 'Logging In...') : (locale === 'vi' ? 'Đăng nhập' : 'Log In') }}</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}
</style>
