<template>
  <div class="unlock-container">
    <div class="themed-card unlock-card">
      <h2 class="themed-h2">Déverrouiller votre coffre</h2>
      <div class="form-wrapper">
        <input
          class="themed-input"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          @keyup.enter="unlock"
        />
        <div class="input-actions">
          <button
            class="toggle-password"
            @click="showPassword = !showPassword"
            tabindex="-1"
          >
            <span class="material-icons">{{
              showPassword ? 'visibility_off' : 'visibility'
            }}</span>
          </button>
        </div>
      </div>
      <button class="themed-button button-primary" @click="unlock">
        Déverrouiller
      </button>
      <p>{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter, useRoute } from 'vue-router'

const password = ref('')
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const showPassword = ref(false)
const errorMessage = ref('')

const unlock = async () => {
  try {
    await authStore.unlockKey(password.value)
    const redirect = route.query.redirect || '/password'
    router.push(redirect)
  } catch (error) {
    errorMessage.value = 'Mot de passe incorrect'
  }
}
</script>

<style scoped>
.unlock-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
  width: 100vw;
  overflow-x: hidden;
}

.unlock-card {
  width: 400px;
  text-align: center;
  padding: 32px;
}
</style>
