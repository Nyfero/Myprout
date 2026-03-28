<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="showForgot ? 'forgot' : 'login'">
        <!-- ==================== LOGIN ==================== -->
        <template v-if="!showForgot">
          <!-- Header -->
          <div class="login-header">
            <h2 class="themed-h2">Connexion</h2>
          </div>

          <!-- Body -->
          <div class="login-body">
            <form @submit.prevent="onSubmit">
              <input
                class="themed-input"
                v-model="form.email"
                type="email"
                placeholder="E-mail"
                required
              />
              <div class="form-wrapper">
                <input
                  class="themed-input"
                  v-model="form.password"
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
                    <span class="material-icons">
                      {{ showPassword ? 'visibility_off' : 'visibility' }}
                    </span>
                  </button>
                </div>
              </div>
              <a
                class="forgot-password"
                href="#"
                @click.prevent="showForgot = true"
              >
                Mot de passe oublié ?
              </a>
              <p class="form-error">{{ errorMessage }}</p>

              <!-- Footer -->
              <div class="login-footer">
                <button
                  class="themed-button button-primary"
                  type="submit"
                  :disabled="!isLoginValid"
                >
                  Se connecter
                </button>
                <button
                  class="themed-button button-secondary"
                  type="button"
                  @click="$emit('switch')"
                >
                  Créer un compte
                </button>
              </div>
            </form>
          </div>
        </template>

        <!-- ==================== FORGOT PASSWORD ==================== -->
        <template v-else>
          <!-- Header -->
          <div class="login-header">
            <h2 class="themed-h2">Mot de passe oublié ?</h2>
          </div>

          <!-- Body -->
          <div class="login-body">
            <p class="recovery-info">
              Entrez votre adresse e-mail pour recevoir vos mots de
              récupération.
            </p>
            <form @submit.prevent="handleForgotEmail">
              <input
                class="themed-input"
                v-model="forgotEmail"
                type="email"
                placeholder="Votre adresse e-mail"
                required
              />
              <p v-if="forgotError" class="form-error">{{ forgotError }}</p>

              <!-- Footer -->
              <div class="login-footer">
                <button
                  class="themed-button button-primary"
                  type="submit"
                  :disabled="forgotLoading"
                >
                  {{ forgotLoading ? 'En cours...' : 'Continuer' }}
                </button>
                <button
                  class="themed-button button-secondary"
                  type="button"
                  @click="showForgot = false"
                >
                  Retour à la connexion
                </button>
              </div>
            </form>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import api from '@/services/api.js'

// ==================== State ====================
const showForgot = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')
const forgotEmail = ref('')
const forgotError = ref('')
const forgotLoading = ref(false)

// ==================== Stores / Router ====================
const authStore = useAuthStore()
const router = useRouter()

// ==================== Form ====================
const form = ref({
  email: '',
  password: '',
})

const isLoginValid = computed(
  () => form.value.email.length > 0 && form.value.password.length > 0
)

// ==================== Methods ====================
async function onSubmit() {
  if (!form.value.email || !form.value.password) {
    alert('Veuillez remplir tous les champs.')
    return
  }

  try {
    const response = await api.post('/auth/login', {
      email: form.value.email,
      password: form.value.password,
    })

    const { token, kek_salt, encrypted_crypto_key, user } = response.data
    const crypto_key = await unlockCryptoKey(
      form.value.password,
      kek_salt,
      encrypted_crypto_key
    )
    await authStore.login(user, token, crypto_key)
    await router.push({ name: 'Password' })
    authStore.isLoggingIn = false
  } catch (error) {
    errorMessage.value =
      error.response?.data?.error ?? 'Erreur de connexion au serveur'
  }
}

async function handleForgotEmail() {
  // À implémenter
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

.forgot-password {
  font-size: 0.9em;
  color: grey;
  text-decoration: underline;
  cursor: pointer;
  margin-top: 0.2em;
}

.forgot-password:hover {
  color: #c25fff;
}

.recovery-info {
  font-size: 0.9em;
  color: grey;
  line-height: 1.5;
  text-align: center;
}
</style>
