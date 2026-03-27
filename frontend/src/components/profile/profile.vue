<template>
  <h2 class="themed-h2">Votre profil</h2>

  <div class="info-container">

    <div class="profil-info">
      <label class="themed-label">Prénom</label>
      <div class="info-row" v-if="authStore.user">
        <span>{{ authStore.user.firstName }}</span>
        <!-- <button class="themed-button button-secondary icon-btn" title="Modifier">
          <span class="material-icons">edit</span>
        </button> -->
      </div>
    </div>

    <div class="profil-info">
      <label class="themed-label">Nom</label>
      <div class="info-row" v-if="authStore.user">
          <span>{{ authStore.user.lastName }}</span>
        <!-- <button class="themed-button button-secondary icon-btn" title="Modifier">
          <span class="material-icons">edit</span>
        </button> -->
      </div>
    </div>

  </div>

  <div class="themed-separator" />

  <div class="logout-container">
    <div class="flex-1"></div>
    <button class="themed-button button-primary btn-logout flex-2" @click="logout()">
      <span>Déconnexion</span>
      <span class="material-icons">exit_to_app</span>
    </button>
    <div class="flex-1"></div>
  </div>
</template>

<script setup>
import { useProfile } from './composables/useProfile'
const { authStore, logout } = useProfile()
</script>

<style scoped>
/* LOGOUT */
.logout-container {
  display: flex;
  justify-content: center;
}

.btn-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
</style>