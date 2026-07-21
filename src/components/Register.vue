<script setup lang="ts">
import { ref, inject } from 'vue'
import { User, Lock, Cpu, Eye, EyeOff, Loader2, Shield, UserPlus, CheckCircle2 } from 'lucide-vue-next'
import { registerApi } from '../utils/api'

const emit = defineEmits<{
  (e: 'register-success', username: string): void
  (e: 'switch-to-login'): void
}>()

const isDark = inject<any>('isDark')
const t = inject<any>('t')
const locale = inject<any>('locale')

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const role = ref('USER')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleRegister = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!username.value || !password.value || !confirmPassword.value) {
    errorMessage.value = locale.value === 'vi' 
      ? 'Vui lòng điền đầy đủ tất cả các trường!' 
      : 'Please fill in all fields!'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = locale.value === 'vi' 
      ? 'Mật khẩu xác nhận không khớp!' 
      : 'Passwords do not match!'
    return
  }

  if (password.value.length < 4) {
    errorMessage.value = locale.value === 'vi'
      ? 'Mật khẩu phải có ít nhất 4 ký tự!'
      : 'Password must be at least 4 characters!'
    return
  }

  isLoading.value = true

  try {
    const res = await registerApi({
      username: username.value,
      password: password.value,
      role: role.value
    })

    if (res.success) {
      successMessage.value = res.message || (locale.value === 'vi' 
        ? 'Đăng ký tài khoản thành công!' 
        : 'Registration successful!')
      
      setTimeout(() => {
        emit('register-success', username.value)
      }, 1200)
    } else {
      errorMessage.value = res.message || (locale.value === 'vi' 
        ? 'Đăng ký thất bại!' 
        : 'Registration failed!')
    }
  } catch (error: any) {
    console.error('Register error:', error)
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
      class="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-cyan-500/10 filter blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"
    />
    <div 
      v-if="isDark"
      class="absolute -bottom-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/10 filter blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"
    />

    <!-- Header / Brand -->
    <div class="flex flex-col items-center mb-6 text-center">
      <div 
        class="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br mb-3 transition-all duration-300 shadow-lg"
        :class="isDark 
          ? 'from-cyan-500 to-indigo-600 shadow-cyan-500/20' 
          : 'from-cyan-600 to-indigo-500'"
      >
        <UserPlus class="w-7 h-7 text-white" />
        <span class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-400 border-2" :class="isDark ? 'border-slate-950' : 'border-white'"></span>
      </div>
      
      <h2 
        class="text-2xl font-black tracking-wider text-transparent bg-clip-text uppercase"
        :class="isDark 
          ? 'bg-gradient-to-r from-cyan-400 via-indigo-200 to-white' 
          : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-slate-800'"
      >
        {{ locale === 'vi' ? 'Đăng Ký Tài Khoản' : 'Create Account' }}
      </h2>
      <p 
        class="text-xs uppercase font-semibold tracking-wider mt-1"
        :class="isDark ? 'text-slate-400' : 'text-slate-500'"
      >
        {{ locale === 'vi' ? 'Tạo tài khoản mới để truy cập hệ thống' : 'Register a new account for system access' }}
      </p>
    </div>

    <!-- Error message Alert -->
    <div 
      v-if="errorMessage" 
      class="mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold animate-shake"
      :class="isDark 
        ? 'bg-red-950/30 border-red-500/30 text-red-400 shadow-inner' 
        : 'bg-red-50 border-red-200 text-red-600'"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse"></span>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Success message Alert -->
    <div 
      v-if="successMessage" 
      class="mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold"
      :class="isDark 
        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 shadow-inner' 
        : 'bg-emerald-50 border-emerald-200 text-emerald-600'"
    >
      <CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Register Form -->
    <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
      <!-- Username field -->
      <div class="flex flex-col gap-1.5">
        <label 
          class="text-xs font-bold uppercase tracking-wider text-left"
          :class="isDark ? 'text-slate-400' : 'text-slate-500'"
        >
          {{ locale === 'vi' ? 'Tên tài khoản' : 'Username' }}
        </label>
        <div class="relative flex items-center">
          <span 
            class="absolute left-4"
            :class="isDark ? 'text-slate-500' : 'text-slate-400'"
          >
            <User class="w-4 h-4" />
          </span>
          <input 
            type="text" 
            v-model="username"
            :disabled="isLoading"
            class="w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 outline-none"
            :class="isDark 
              ? 'bg-slate-900/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-cyan-500/50 focus:bg-slate-900/90' 
              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500/60 focus:bg-white'"
            :placeholder="locale === 'vi' ? 'Nhập tên tài khoản mới...' : 'Enter new username...'"
          />
        </div>
      </div>

      <!-- Password field -->
      <div class="flex flex-col gap-1.5">
        <label 
          class="text-xs font-bold uppercase tracking-wider text-left"
          :class="isDark ? 'text-slate-400' : 'text-slate-500'"
        >
          {{ locale === 'vi' ? 'Mật khẩu' : 'Password' }}
        </label>
        <div class="relative flex items-center">
          <span 
            class="absolute left-4"
            :class="isDark ? 'text-slate-500' : 'text-slate-400'"
          >
            <Lock class="w-4 h-4" />
          </span>
          <input 
            :type="showPassword ? 'text' : 'password'" 
            v-model="password"
            :disabled="isLoading"
            class="w-full pl-11 pr-12 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 outline-none"
            :class="isDark 
              ? 'bg-slate-900/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-cyan-500/50 focus:bg-slate-900/90' 
              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500/60 focus:bg-white'"
            :placeholder="locale === 'vi' ? 'Nhập mật khẩu...' : 'Enter password...'"
          />
          <button 
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3.5 p-1 rounded hover:bg-slate-800/20 text-slate-400 hover:text-cyan-500 transition cursor-pointer select-none"
            :class="isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'"
          >
            <component :is="showPassword ? EyeOff : Eye" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Confirm Password field -->
      <div class="flex flex-col gap-1.5">
        <label 
          class="text-xs font-bold uppercase tracking-wider text-left"
          :class="isDark ? 'text-slate-400' : 'text-slate-500'"
        >
          {{ locale === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm Password' }}
        </label>
        <div class="relative flex items-center">
          <span 
            class="absolute left-4"
            :class="isDark ? 'text-slate-500' : 'text-slate-400'"
          >
            <Lock class="w-4 h-4" />
          </span>
          <input 
            :type="showConfirmPassword ? 'text' : 'password'" 
            v-model="confirmPassword"
            :disabled="isLoading"
            class="w-full pl-11 pr-12 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 outline-none"
            :class="isDark 
              ? 'bg-slate-900/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-cyan-500/50 focus:bg-slate-900/90' 
              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500/60 focus:bg-white'"
            :placeholder="locale === 'vi' ? 'Nhập lại mật khẩu...' : 'Confirm password...'"
          />
          <button 
            type="button"
            @click="showConfirmPassword = !showConfirmPassword"
            class="absolute right-3.5 p-1 rounded hover:bg-slate-800/20 text-slate-400 hover:text-cyan-500 transition cursor-pointer select-none"
            :class="isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'"
          >
            <component :is="showConfirmPassword ? EyeOff : Eye" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Role selector -->
      <div class="flex flex-col gap-1.5">
        <label 
          class="text-xs font-bold uppercase tracking-wider text-left flex items-center gap-1"
          :class="isDark ? 'text-slate-400' : 'text-slate-500'"
        >
          <Shield class="w-3.5 h-3.5 text-cyan-500" />
          <span>{{ locale === 'vi' ? 'Vai trò (Role)' : 'Account Role' }}</span>
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button 
            type="button"
            @click="role = 'USER'"
            class="py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            :class="role === 'USER'
              ? (isDark ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-cyan-50 border-cyan-500 text-cyan-700')
              : (isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600')"
          >
            <span>USER</span>
          </button>
          <button 
            type="button"
            @click="role = 'ADMIN'"
            class="py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            :class="role === 'ADMIN'
              ? (isDark ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-500 text-indigo-700')
              : (isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600')"
          >
            <span>ADMIN</span>
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
        <span>{{ isLoading ? (locale === 'vi' ? 'Đang đăng ký...' : 'Registering...') : (locale === 'vi' ? 'Đăng ký tài khoản' : 'Register Account') }}</span>
      </button>

      <!-- Switch back to Login -->
      <div class="mt-3 text-center">
        <button 
          type="button"
          @click="emit('switch-to-login')"
          class="text-xs font-semibold hover:underline cursor-pointer transition-colors"
          :class="isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'"
        >
          {{ locale === 'vi' ? 'Đã có tài khoản? Đăng nhập ngay' : 'Already have an account? Log in now' }}
        </button>
      </div>
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
