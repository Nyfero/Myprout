<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="showForgot ? 'forgot' : 'login'">
        <!-- ==================== LOGIN ==================== -->
        <template v-if="step === 'login'">
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
                @click.prevent="step = 'forgot'"
              >
                Mot de passe oublié ?
              </a>
              <p class="form-error">{{ errorMessage }}</p>

              <!-- Footer -->
              <div class="login-footer">
                <button
                  class="themed-button button-primary"
                  type="submit"
                  :disabled="!isLoginValid || isLoading"
                >
                  {{ isLoading ? 'En cours...' : 'Se connecter' }}
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
        <template v-else-if="step === 'forgot'">
          <!-- Header -->
          <div class="login-header">
            <h2 class="themed-h2">Mot de passe oublié</h2>
          </div>

          <!-- Body -->
          <div class="login-body">
            <p class="forgot-subtitle">
              Entrez votre adresse email pour recevoir un lien de
              réinitialisation.
            </p>
            <div class="input-group">
              <input
                class="themed-input"
                v-model="forgotEmail"
                type="email"
                placeholder="Votre email"
                :disabled="forgotLoading"
              />
            </div>
            <p v-if="forgotError" class="form-error">{{ forgotError }}</p>
          </div>

          <!-- Footer -->
          <div class="login-footer">
            <button
              class="themed-button button-primary"
              @click="handleForgotPassword"
              :disabled="!isForgotValid || forgotLoading"
            >
              {{ forgotLoading ? 'Envoi...' : 'Envoyer le lien' }}
            </button>
            <button
              class="themed-button button-secondary"
              @click="step = 'login'"
            >
              Retour
            </button>
          </div>
        </template>

        <template v-else-if="step === 'email-sent'">
          <!-- Header -->
          <div class="login-header">
            <h2 class="themed-h2">Email envoyé !</h2>
          </div>

          <!-- Body -->
          <div class="login-body">
            <p>
              Un email de réinitialisation va être envoyé dans quelque instant à
              :
            </p>
            <button v-if="mailboxUrl" class="themed-button button-primary">
              <a :href="mailboxUrl" target="_blank" class="email-link-btn">
                <span class="material-icons">open_in_new</span>
                {{ forgotEmail }}
              </a>
            </button>
            <strong v-else class="themed-label">{{ forgotEmail }}</strong>
            <p>Pensez à vérifier vos spams.</p>
          </div>

          <!-- Footer -->
          <div class="login-footer">
            <button
              class="themed-button button-secondary"
              @click="step = 'login'"
            >
              Retour à la connexion
            </button>
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
import { unlockCryptoKey } from '@/utils/crypto'
import api from '@/services/api.js'

// ==================== State ====================
const step = ref('login') // 'login' | 'forgot' | 'email-sent'
const showPassword = ref(false)
const errorMessage = ref('')
const isLoading = ref(false)
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

const isForgotValid = computed(() => forgotEmail.value.length > 0)

// ==================== Forgot ====================
const emailProviders = {
  'gmail.com': 'https://mail.google.com',
  'googlemail.com': 'https://mail.google.com',
  'outlook.com': 'https://outlook.live.com',
  'hotmail.com': 'https://outlook.live.com',
  'live.com': 'https://outlook.live.com',
  'yahoo.com': 'https://mail.yahoo.com',
  'yahoo.fr': 'https://mail.yahoo.com',
  'icloud.com': 'https://www.icloud.com/mail',
  'me.com': 'https://www.icloud.com/mail',
  'zimbra.com': 'https://zimbra.com',
  'laposte.net': 'https://www.laposte.net/accueil',
  'orange.fr': 'https://mail.orange.fr',
  'free.fr': 'https://webmail.free.fr',
  'sfr.fr': 'https://webmail.sfr.fr',
}

const mailboxUrl = computed(() => {
  const domain = forgotEmail.value.split('@')[1]
  return emailProviders[domain] || null
})

// ==================== Methods ====================
async function onSubmit() {
  if (!form.value.email || !form.value.password) {
    alert('Veuillez remplir tous les champs.')
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await api.post('/auth/login', {
      email: form.value.email,
      password: form.value.password,
    })

    const { token, user } = response.data
    const crypto_key = await unlockCryptoKey(
      form.value.password,
      user.kek_salt,
      user.encrypted_crypto_key
    )
    await authStore.login(user, token, crypto_key)
    await router.push({ name: 'Password' })
    authStore.isLoggingIn = false
  } catch (error) {
    errorMessage.value =
      error.response?.data?.error ?? 'Erreur de connexion au serveur'
  } finally {
    isLoading.value = false
  }
}

async function handleForgotPassword() {
  if (!forgotEmail.value) {
    forgotError.value = 'Veuillez entrer votre adresse email.'
    return
  }

  forgotLoading.value = true
  forgotError.value = ''

  try {
    await api.post('/auth/password/forgot', {
      email: forgotEmail.value,
    })

    step.value = 'email-sent'
  } catch (error) {
    forgotError.value =
      error.response?.data?.error || 'Une erreur est survenue.'
  } finally {
    forgotLoading.value = false
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

.email-link-btn {
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
