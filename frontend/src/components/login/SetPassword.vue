<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="step">
        <!-- Étape 1 : Saisie du mot de passe -->
        <template v-if="step === 'form'">
          <h2 class="themed-h2">Définir votre mot de passe</h2>
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
            <button
              class="themed-button button-primary login-button"
              type="submit"
              :disabled="isLoading"
            >
              {{ isLoading ? 'En cours...' : 'Valider' }}
            </button>
            <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
          </form>
        </template>

        <!-- Étape 2 : Succès -->
        <template v-else-if="step === 'done'">
          <h2 class="themed-h2">Mot de passe défini avec succès !</h2>
          <button
            class="themed-button button-secondary login-button"
            @click="$emit('switch')"
          >
            Se connecter
          </button>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const token = route.query.token

const step = ref('form')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

onMounted(() => {
  if (!token) {
    errorMessage.value = 'Token manquant ou invalide'
  }
})

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
