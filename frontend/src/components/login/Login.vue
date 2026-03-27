<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="showForgot ? 'forgot' : 'login'">
        <template v-if="!showForgot">
          <h2 class="themed-h2">Connexion</h2>
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
              @click.prevent="handleForgotPassword"
            >
              Mot de passe oublié ?
            </a>
            <p class="form-error">{{ errorMessage }}</p>
            <button
              class="themed-button button-primary"
              type="submit"
              :disabled="!isLoginValid"
            >
              Se connecter
            </button>
          </form>
          <button
            class="themed-button button-secondary login-button"
            @click="$emit('switch')"
          >
            Créer un compte
          </button>
        </template>
        <template v-else>
          <h2 class="themed-h2">Mot de passe oublié ?</h2>
          <p class="recovery-info">
            Entrez votre adresse e-mail pour recevoir vos mots de récupération.
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
            <button
              class="themed-button button-primary login-button"
              type="submit"
              :disabled="forgotLoading"
            >
              {{ forgotLoading ? 'En cours...' : 'Continuer' }}
            </button>
          </form>
          <button
            class="themed-button button-secondary login-button"
            @click="handleResetForgot"
          >
            Retour à la connexion
          </button>
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

const showForgot = ref(false)
const showPassword = ref(false)
const authStore = useAuthStore()
const router = useRouter()
const errorMessage = ref('')

const form = ref({
  email: '',
  password: '',
})

const isLoginValid = computed(
  () => form.value.email.length > 0 && form.value.password.length > 0
)

function handleForgotPassword() {
  showForgot.value = true
}

function handleResetForgot() {
  showForgot.value = false
}

async function onSubmit() {
  if (form.value.email === '' || form.value.password === '') {
    alert('Veuillez remplir tous les champs.')
    return
  }

  try {
    const response = await api.post('/auth/login', {
      email: form.value.email,
      password: form.value.password,
    })

    const { token, user, crypto_salt } = response.data

    authStore.login(user, token, form.value.password, crypto_salt)
    router.push('/password')
  } catch (error) {
    if (error.response) {
      errorMessage.value = error.response.data.error
    } else {
      errorMessage.value = 'Erreur de connexion au serveur'
    }
  }
}
</script>

<style scoped>
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
</style>
