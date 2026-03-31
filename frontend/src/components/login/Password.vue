<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="step">
        <!-- ==================== FORM ==================== -->
        <template v-if="step === 'form'">
          <div class="login-header">
            <h2 class="themed-h2">Définir votre mot de passe</h2>
          </div>

          <div class="login-body">
            <form @submit.prevent="handleSubmit">
              <div class="form-wrapper">
                <input
                  class="themed-input"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Mot de passe"
                  required
                />
                <div class="input-actions">
                  <button
                    class="toggle-password"
                    type="button"
                    @click="showPassword = !showPassword"
                  >
                    <span class="material-icons">{{
                      showPassword ? 'visibility_off' : 'visibility'
                    }}</span>
                  </button>
                </div>
              </div>

              <ul class="strength-criteria">
                <li :class="criteria.length ? 'met' : 'unmet'">
                  <span class="criteria-icon">{{
                    criteria.length ? '✓' : '✗'
                  }}</span>
                  8 caractères minimum
                </li>
                <li :class="criteria.upper ? 'met' : 'unmet'">
                  <span class="criteria-icon">{{
                    criteria.upper ? '✓' : '✗'
                  }}</span>
                  Une lettre majuscule
                </li>
                <li :class="criteria.number ? 'met' : 'unmet'">
                  <span class="criteria-icon">{{
                    criteria.number ? '✓' : '✗'
                  }}</span>
                  Un chiffre
                </li>
                <li :class="criteria.special ? 'met' : 'unmet'">
                  <span class="criteria-icon">{{
                    criteria.special ? '✓' : '✗'
                  }}</span>
                  Un caractère spécial (!@#$%...)
                </li>
              </ul>

              <div class="form-wrapper">
                <input
                  class="themed-input"
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="Confirmer le mot de passe"
                  required
                />
                <div class="input-actions">
                  <button
                    class="toggle-password"
                    type="button"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <span class="material-icons">{{
                      showConfirmPassword ? 'visibility_off' : 'visibility'
                    }}</span>
                  </button>
                </div>
              </div>

              <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

              <div class="login-footer">
                <button
                  class="themed-button button-primary"
                  type="submit"
                  :disabled="isLoading"
                >
                  {{ isLoading ? 'En cours...' : 'Continuer' }}
                </button>
              </div>
            </form>
          </div>
        </template>

        <!-- ==================== SUCCESS ==================== -->
        <template v-else-if="step === 'done'">
          <div class="login-header">
            <svg class="svg" viewBox="0 0 52 52" stroke="#4bb543">
              <circle class="svg-circle" cx="26" cy="26" r="25" fill="none" />
              <path class="svg-check" fill="none" d="M14 27l7 7 16-16" />
            </svg>
            <h2 class="themed-h2">Mot de passe réinitialisé avec succès !</h2>
          </div>
          <div class="login-body">
            <p>
              Vous pouvez maintenant vous connecter avec votre nouveau mot de
              passe.
            </p>
          </div>
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
import { deriveKek, encryptCryptoKey } from '@/utils/crypto'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const props = defineProps({
  token: String,
  mode: {
    type: String,
    default: 'set', // 'set' | 'reset'
  },
  cryptoKey: String,
  kekSalt: String,
})

const emit = defineEmits(['switch', 'next'])
const route = useRoute()
const token = route.query.token

const step = ref('form')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const criteria = computed(() => ({
  length: password.value.length >= 8,
  upper: /[A-Z]/.test(password.value),
  number: /[0-9]/.test(password.value),
  special: /[^A-Za-z0-9]/.test(password.value),
}))

onMounted(() => {
  if (!token) errorMessage.value = 'Token manquant ou invalide'
})

async function handleSubmit() {
  errorMessage.value = ''

  // if (!Object.values(criteria.value).every(Boolean)) {
  //   errorMessage.value = 'Le mot de passe ne respecte pas les critères'
  //   return
  // }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Les mots de passe ne correspondent pas'
    return
  }

  isLoading.value = true
  try {
    if (props.mode === 'reset') {
      const kek = await deriveKek(password.value, props.kekSalt)
      const encrypted_crypto_key = await encryptCryptoKey(props.cryptoKey, kek)

      await api.put('/auth/password/reset', {
        token: props.token,
        encrypted_crypto_key,
        password: password.value,
      })
      step.value = 'done'
    } else {
      emit('next', { token, password: password.value })
    }
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

.login-subtitle {
  font-size: 0.85em;
  color: #aaa;
  margin-top: 0.4em;
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

/* ==================== Question Block ==================== */
.question-block {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 1em;
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  margin-bottom: 0.8em;
}

.question-label {
  font-size: 0.8em;
  font-weight: 600;
  color: #aaa;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.char-counter {
  position: absolute;
  bottom: 10px;
  right: 10px;
}

.themed-input {
  padding-right: 3em;
}

/* ==================== Select ==================== */
.themed-select-wrapper {
  position: relative;
}

.themed-select {
  width: 100%;
  appearance: none;
  background: var(--input-bg, #1e1e1e);
  color: var(--text-color, #fff);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  padding: 0.6em 2em 0.6em 0.8em;
  font-size: 0.9em;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23aaa'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.7em center;
}

.themed-select:focus {
  outline: none;
  border-color: var(--primary-color, #646cff);
}

/* ==================== Criteria ==================== */
.strength-criteria {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.strength-criteria li {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.8em;
  transition: color 0.3s ease;
}

.strength-criteria li.met {
  color: #4bb543;
}
.strength-criteria li.unmet {
  color: #aaa;
}

.criteria-icon {
  font-size: 0.9em;
  font-weight: 700;
  width: 14px;
  text-align: center;
}

/* ==================== SVG ==================== */
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
