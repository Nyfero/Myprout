<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="passwordSet ? 'toLogin' : 'register'">
        <template v-if="!passwordSet">
          <h2 class="themed-h2">Définir votre mot de passe</h2>
          <form @submit.prevent="setPassword">
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
              :disabled="isLoading">
              {{ isLoading ? "En cours..." : "Valider" }}
            </button>
            <p 
              v-if="errorMessage"
              class="form-error">
              {{ errorMessage }}
            </p>
          </form>
        </template>
        <template v-else>
          <h2 class="themed-h2">Mot de passe défini avec succès !</h2>
          <button 
            class="themed-button button-secondary login-button" 
            @click="$emit('switch')">
            Se connecter
          </button>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';

const route = useRoute();
const token = route.query.token;
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const passwordSet = ref(false);

onMounted(() => {
  if (!token) {
    errorMessage.value = "Token manquant";
  }
});

async function setPassword() {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Les mots de passe ne correspondent pas";
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    await api.post('/auth/set-password', {
      token,
      password: password.value,
    });
    passwordSet.value = true;
  } catch (error) {
    errorMessage.value = error.response?.data?.error || "Une erreur est survenue";
  } finally {
    isLoading.value = false;
  }
}
</script>
