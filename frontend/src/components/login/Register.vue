<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="submitted ? (error ? 'error' : 'confirmation') : 'register'">
        <template v-if="!submitted && !error">
          <h2 class="themed-h2">Créer un compte</h2>
          <form @submit.prevent="register">
            <input
              class="themed-input"
              v-model="form.lastName"
              type="text"
              placeholder="Nom"
              required
            >
            <input
              class="themed-input"
              v-model="form.firstName"
              type="text"
              placeholder="Prénom"
              required
            >
            <input
              class="themed-input"
              v-model="form.email"
              type="email"
              placeholder="E-mail"
              required
            >
            <button 
              class="themed-button button-primary" 
              type="submit" 
              :disabled="isLoading">
              {{ isLoading ? "En cours..." : "S’inscrire" }}
            </button>
          </form>
          <button 
            class="themed-button button-secondary login-button" 
            @click="$emit('switch')">
            Déjà un compte ?
          </button>
        </template>
        <template v-else-if="error">
          <svg class="svg" viewBox="0 0 52 52" stroke="red">
            <circle class="svg-circle" cx="26" cy="26" r="25" fill="none"/>
            <line class="svg-cross-left" x1="16" y1="16" x2="36" y2="36"/>
            <line class="svg-cross-right" x1="36" y1="16" x2="16" y2="36"/>
          </svg>
          <h2 class="themed-h2">Une erreur est survenue :</h2>
          <p class="form-error">{{ errorMessage || "Veuillez réessayer plus tard." }}</p>
          <button 
            class="themed-button button-secondary login-button" 
            @click="resetError">
            Revenir à l'inscription
          </button>
        </template>
        <template v-else>
          <svg class="svg" viewBox="0 0 52 52" stroke="#4bb543">
            <circle class="svg-circle" cx="26" cy="26" r="25" fill="none"/>
            <path class="svg-check" fill="none" d="M14 27l7 7 16-16"/>
          </svg>
          <h2 class="themed-h2">Inscription envoyée</h2>
          <p>{{ successMessage }}</p>
          <button 
            class="themed-button button-secondary login-button" 
            @click="$emit('switch')">
            Revenir à la connexion
          </button>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const submitted = ref(false)
const error = ref(null)
const form = ref({
  lastName: "",
  firstName: "",
  email: ""
});
const isLoading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const router = useRouter()

async function register() {
  isLoading.value = true;
  submitted.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await api.post('/auth/register', {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: form.value.email,
    });
    successMessage.value = response.data.message;
    form.value.firstName = '';
    form.value.lastName = '';
    form.value.email = '';
  } catch (err) {
    error.value = err;
    errorMessage.value = err.response?.data?.error || "Une erreur est survenue";
    submitted.value = true;
  } finally {
    isLoading.value = false;
  }
}

function resetError() {
  error.value = null;
  errorMessage.value = '';
  submitted.value = false;
}
</script>

<style scoped>
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
.svg-cross-left,.svg-check {
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