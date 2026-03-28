<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="step">
        <!-- ==================== FORM ==================== -->
        <template v-if="step === 'form'">
          <!-- Header -->
          <div class="login-header">
            <h2 class="themed-h2">Définir votre mot de passe</h2>
          </div>

          <!-- Body -->
          <div class="login-body">
            <form @submit.prevent="handleSubmit">
              <input
                class="themed-input"
                v-model="password"
                type="password"
                placeholder="Mot de passe"
                required
              />
              <input
                class="themed-input"
                v-model="confirmPassword"
                type="password"
                placeholder="Confirmer le mot de passe"
                required
              />
              <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

              <!-- Footer -->
              <div class="login-footer">
                <button
                  class="themed-button button-primary"
                  type="submit"
                  :disabled="isLoading"
                >
                  {{ isLoading ? 'En cours...' : 'Valider' }}
                </button>
              </div>
            </form>
          </div>
        </template>

        <!-- ==================== SUCCESS ==================== -->
        <template v-else-if="step === 'done'">
          <!-- Header -->
          <div class="login-header">
            <svg class="svg" viewBox="0 0 52 52" stroke="#4bb543">
              <circle class="svg-circle" cx="26" cy="26" r="25" fill="none" />
              <path class="svg-check" fill="none" d="M14 27l7 7 16-16" />
            </svg>
            <h2 class="themed-h2">Mot de passe défini avec succès !</h2>
          </div>

          <!-- Footer -->
          <div class="login-footer">
            <button
              class="themed-button button-secondary"
              @click="$emit('switch')"
            >
              Se connecter
            </button>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

// ==================== Router ====================
const route = useRoute()
const token = route.query.token

// ==================== State ====================
const step = ref('form')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// ==================== Lifecycle ====================
onMounted(() => {
  if (!token) {
    errorMessage.value = 'Token manquant ou invalide'
  }
})

// ==================== Methods ====================
async function handleSubmit() {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Les mots de passe ne correspondent pas'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await api.post('/auth/activate', {
      token,
      password: password.value,
    })

    step.value = 'done'
  } catch (error) {
    errorMessage.value =
      error.response?.data?.error || 'Une erreur est survenue'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-header {
  text-align: center;
  margin-bottom: 1.5em;
}

.login-body {
  display: flex;
  flex-direction: column;
  gap: 0.8em;
}

.login-footer {
  display: flex;
  flex-direction: column;
  gap: 0.6em;
  margin-top: 1em;
}

.svg {
  width: 60px;
  height: 60px;
  display: block;
  stroke-width: 3;
  stroke-miterlimit: 10;
  margin: 0 auto 20px auto;
  border-radius: 50%;
}
.svg-circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
.svg-check {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.4s 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
@keyframes stroke {
  100% {
    stroke-dashoffset: 0;
  }
}
</style>
