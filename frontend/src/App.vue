<script setup>
import { useRoute } from 'vue-router'
import { ref, watchEffect, computed, onMounted, onUnmounted } from 'vue'
import { useInactivity } from '@/composables/useInactivity'
import { useAuthStore } from '@/stores/authStore'
import DustParticles from './components/background/DustParticles.vue'
import Navbar from '@/components/ui/Navbar.vue'

const route = useRoute()
const currentPage = ref(route.path)
const showNavbar = computed(() => route.name !== 'Login')
const authStore = useAuthStore()
const { start, stop } = useInactivity()

watchEffect(() => {
  currentPage.value = route.path
})

onMounted(() => {
  if (authStore.isAuthenticated) start()
})

onUnmounted(() => stop())
</script>

<template>
  <div id="app-container">
    <DustParticles />
    <Navbar v-if="showNavbar" />
    <div id="page-content">
      <router-view />
    </div>
  </div>
</template>

<style>
#app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#page-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
</style>
