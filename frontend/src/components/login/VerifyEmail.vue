<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="step">
        <!-- ==================== SUCCESS ==================== -->
        <template v-if="step === 'done'">
          <div class="login-header">
            <svg class="svg" viewBox="0 0 52 52" stroke="#4bb543">
              <circle class="svg-circle" cx="26" cy="26" r="25" fill="none" />
              <path class="svg-check" fill="none" d="M14 27l7 7 16-16" />
            </svg>
            <h2 class="themed-h2">Adresse email confirmée !</h2>
          </div>

          <div class="login-body">
            <p>
              Votre adresse email a bien été vérifiée. Votre compte est en
              attente de validation par un administrateur. Vous recevrez un
              email dès que votre compte sera activé.
            </p>
          </div>
          <div class="login-footer">
            <button
              class="themed-button button-secondary"
              @click="$emit('switch')"
            >
              Retour à la connexion
            </button>
          </div>
        </template>

        <!-- ==================== ERROR ==================== -->
        <template v-else-if="step === 'error'">
          <svg class="svg" viewBox="0 0 52 52" stroke="#e74c3c">
            <circle class="svg-circle" cx="26" cy="26" r="25" fill="none" />
            <path fill="none" d="M16 16 36 36 M36 16 16 36" />
          </svg>
          <div class="login-header">
            <h2 class="themed-h2">Lien invalide ou expiré</h2>
          </div>
          <div class="login-body">
            <p>
              Ce lien de confirmation est invalide ou a expiré. Veuillez faire
              une nouvelle demande.
            </p>
          </div>
          <div class="login-footer">
            <button
              class="themed-button button-secondary"
              @click="$emit('switch')"
            >
              Retour à la connexion
            </button>
          </div>
        </template>

        <!-- ==================== LOADING ==================== -->
        <template v-else>
          <div class="login-header">
            <p>Vérification en cours...</p>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const props = defineProps({
  token: String,
})

const step = ref('loading') // 'loading' | 'done' | 'error'
const emit = defineEmits(['switch'])

onMounted(async () => {
  try {
    await api.post('/auth/verify-email', {
      token: props.token,
    })
    step.value = 'done'
  } catch (error) {
    step.value = 'error'
  }
})
</script>

<style scoped>
.login-header {
  text-align: center;
  margin-bottom: 1.5em;
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
