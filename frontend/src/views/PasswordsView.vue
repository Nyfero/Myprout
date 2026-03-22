<template>
  <div v-if="authStore.isLoggingIn" :class="{ 'loading-container': authStore.isLoggingIn }">
    <span class="material-icons spinning">lock_open</span>
    <p>Déchiffrement en cours...</p>
  </div>

  <div v-else class="themed-card passwords-page">
      <PasswordsList />
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore'
import PasswordsList from '@/components/passwords/PasswordsList.vue';

const authStore = useAuthStore()
</script>

<style scoped>
.passwords-page {
  height: 100%;
  overflow: hidden;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: #aaa;
}

.spinning {
  font-size: 3rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>