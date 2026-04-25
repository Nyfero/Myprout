<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="submitted ? (error ? 'error' : 'confirmation') : 'register'">
        <!-- ==================== REGISTER ==================== -->
        <template v-if="step === 'register'">
          <!-- Header -->
          <div class="login-header">
            <h2 class="themed-h2">Créer un compte</h2>
          </div>

          <!-- Body -->
          <div class="login-body">
            <form @submit.prevent="register">
              <input
                class="themed-input"
                v-model="form.lastName"
                type="text"
                placeholder="Nom"
                required
              />
              <input
                class="themed-input"
                v-model="form.firstName"
                type="text"
                placeholder="Prénom"
                required
              />
              <input
                class="themed-input"
                v-model="form.email"
                type="email"
                placeholder="E-mail"
                required
              />

              <a
                class="forgot-password"
                href="#"
                @click.prevent="step = 'demo'"
              >
                Essayer la démo ?
              </a>

              <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

              <!-- Footer -->
              <div class="login-footer">
                <button
                  class="themed-button button-primary"
                  type="submit"
                  :disabled="!isRegisterValid || isLoading"
                >
                  {{ isLoading ? 'En cours...' : "S'inscrire" }}
                </button>
                <button
                  class="themed-button button-secondary"
                  type="button"
                  @click="$emit('switch')"
                >
                  Déjà un compte ?
                </button>
              </div>
            </form>
          </div>
        </template>

        <!-- ==================== DEMO ======================= -->
        <template v-else-if="step === 'demo'">
          <!-- Header -->
          <div class="login-header">
            <h2 class="themed-h2">Accès démo</h2>
          </div>

          <!-- Body -->
          <div class="login-body">
            <p class="forgot-subtitle">
              Un compte temporaire sera créé pour vous avec des données
              d'exemple. Il sera automatiquement supprimé après
              <strong>1 heure</strong>.
            </p>
          </div>

          <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

          <!-- Footer -->
          <div class="login-footer">
            <button
              class="themed-button button-primary"
              @click="handleDemoLogin"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Création...' : 'Créer un compte démo' }}
            </button>
            <button
              class="themed-button button-secondary"
              @click="step = 'register'"
            >
              Retour
            </button>
          </div>
        </template>

        <!-- ==================== SUCCESS ==================== -->
        <template v-else-if="step === 'success'">
          <!-- Header -->
          <div class="login-header">
            <svg class="svg" viewBox="0 0 52 52" stroke="#4bb543">
              <circle class="svg-circle" cx="26" cy="26" r="25" fill="none" />
              <path class="svg-check" fill="none" d="M14 27l7 7 16-16" />
            </svg>
            <h2 v-if="from === 'register'" class="themed-h2">Inscription enregistré</h2>
            <h2 v-else class="themed-h2">Compte démo créé</h2>
          </div>

          <!-- Body -->
            <!-- Register  -->
          <div v-if="from === 'register'" class="login-body">
            <p class="recovery-info">{{ successMessage }}</p>
          </div>

            <!-- Demo -->
          <div v-else class="login-body">
            <p class="forgot-subtitle">
              Voici les codes d'authentification pour la démonstration :
            </p>

            <div class="profil-info">
              <label class="themed-label">E-mail :</label>
              <div class="info-row">
                <span>{{ demoCredentials.email }}</span>
              </div>
            </div>

            <div class="profil-info">
              <label class="themed-label">Mot de passe :</label>
              <div class="info-row">
                <span>{{ demoCredentials.password }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="login-footer">
            <button
              class="themed-button button-secondary"
              @click="$emit('switch')"
            >
              Revenir à la connexion
            </button>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '@/services/api'

// ==================== State ====================
const step = ref('register') // 'register' | 'demo' | 'success'
const from = ref('register') // 'register' | 'demo'
const submitted = ref(false)
const isLoading = ref(false)
const error = ref(null)
const errorMessage = ref('')
const successMessage = ref('')
const demoCredentials = ref({
  email: '',
  password: '',
})

// ==================== Form ====================
const form = ref({
  lastName: '',
  firstName: '',
  email: '',
})

const isRegisterValid = computed(
  () =>
    form.value.lastName.length > 0 &&
    form.value.firstName.length > 0 &&
    form.value.email.length > 0
)

// ==================== Methods ====================
async function register() {
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  error.value = null

  try {
    const response = await api.post('/auth/register', {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: form.value.email,
    })

    successMessage.value = response.data.message
    form.value = { firstName: '', lastName: '', email: '' }
    submitted.value = true
    from.value = 'register'
    step.value = 'success'
  } catch (err) {
    error.value = err
    errorMessage.value = err.response?.data?.error || "Une erreur est survenue lors de l'inscription"
  } finally {
    isLoading.value = false
  }
}

async function handleDemoLogin() {
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  error.value = null

  try {
    const res = await api.post('/auth/demo')
    demoCredentials.value.email = res.credentials.email
    demoCredentials.value.password = res.credentials.password
    submitted.value = true
    from.value = 'demo'
    step.value = 'success'
  } catch (err) {
    error.value = err
    errorMessage.value = err.response?.data?.error || "Une erreur est survenue lors de la creation du compte démo"
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

.recovery-info {
  font-size: 0.9em;
  color: grey;
  line-height: 1.5;
  text-align: center;
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
.svg-cross-left,
.svg-check {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.4s 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
.svg-cross-right {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.6s 0.8s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
@keyframes stroke {
  100% {
    stroke-dashoffset: 0;
  }
}
</style>
