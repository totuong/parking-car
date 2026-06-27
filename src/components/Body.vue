<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, inject } from "vue"
import ParkingDashboard from "./ParkingDashboard.vue"
import Sidebar from "./layout/Sidebar.vue"

const isDark = inject<any>("isDark")

const isCollapsed = ref(false)
const activeSection = ref("section-overview")
const mainScrollRef = ref<HTMLElement | null>(null)

const sectionIds = [
  "section-overview",
  "section-twin",
  "section-cctv",
  "section-analytics",
  "section-activity",
]

let observer: IntersectionObserver | null = null

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId)
  if (!el) return

  activeSection.value = sectionId
  el.scrollIntoView({ behavior: "smooth", block: "start" })
  el.classList.add("section-focus-pulse")
  window.setTimeout(() => el.classList.remove("section-focus-pulse"), 1200)
}

function setupSectionObserver() {
  if (!mainScrollRef.value) return

  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

      const top = visible[0]
      if (top?.target.id) {
        activeSection.value = top.target.id
      }
    },
    {
      root: mainScrollRef.value,
      threshold: [0.15, 0.35, 0.55],
      rootMargin: "-8% 0px -55% 0px",
    },
  )

  for (const id of sectionIds) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }
}

onMounted(() => {
  window.setTimeout(setupSectionObserver, 400)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    class="flex flex-1 min-h-0 relative transition-colors duration-300"
    :class="isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'"
  >
    <Sidebar
      :active-section="activeSection"
      :is-collapsed="isCollapsed"
      @navigate="scrollToSection"
      @toggle-sidebar="toggleSidebar"
    />

    <main
      ref="mainScrollRef"
      class="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-8 relative scroll-smooth"
    >
      <div
        v-if="isDark"
        class="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/2 filter blur-[150px] pointer-events-none"
      />
      <div
        v-if="isDark"
        class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/2 filter blur-[150px] pointer-events-none"
      />
      <div
        v-if="!isDark"
        class="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.025] filter blur-[150px] pointer-events-none"
      />
      <div
        v-if="!isDark"
        class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.025] filter blur-[150px] pointer-events-none"
      />

      <div class="relative z-10 flex flex-col gap-10">
        <ParkingDashboard />
      </div>
    </main>
  </div>
</template>

<style scoped>
:deep(.section-anchor) {
  scroll-margin-top: 1.5rem;
}

:deep(.section-focus-pulse) {
  animation: section-focus 1.2s ease-out;
}

@keyframes section-focus {
  0% {
    box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.45);
  }
  40% {
    box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.2);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
  }
}
</style>
