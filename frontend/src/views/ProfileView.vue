<template>
  <div class="profil-container">

    <!-- PROFIL -->
    <div class="themed-card left-row">
      <h2 class="themed-h2">Votre profil</h2>

      <div class="info-container">

        <div class="profil-info">
          <label class="themed-label">Prénom</label>
          <div class="info-row">
            <span>{{ authStore.user.firstName }}</span>
            <button class="themed-button button-secondary icon-btn" title="Modifier">
              <span class="material-icons">edit</span>
            </button>
          </div>
        </div>

        <div class="profil-info">
          <label class="themed-label">Nom</label>
          <div class="info-row">
            <span>{{ authStore.user.lastName }}</span>
            <button class="themed-button button-secondary icon-btn" title="Modifier">
              <span class="material-icons">edit</span>
            </button>
          </div>
        </div>

      </div>

      <div class="logout-container">
        <button class="themed-button button-primary btn-logout" @click="logout()">
          <span class="material-icons">exit_to_app</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>

    <!-- GESTION DU COMPTE -->
    <div class="themed-card middle-row">
      <h2 class="themed-h2">Gestion du compte</h2>

      <div class="info-container">

        <div class="profil-info">
          <label class="themed-label">E-mail</label>
          <div class="info-row">
            <span>{{ authStore.user.email }}</span>
            <button class="themed-button button-secondary icon-btn" title="Modifier">
              <span class="material-icons">edit</span>
            </button>
          </div>
        </div>

        <div class="profil-info">
          <label class="themed-label">Mot de passe</label>
          <div class="info-row">
            <span>••••••••</span>
            <button class="themed-button button-secondary icon-btn" title="Modifier">
              <span class="material-icons">edit</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- SECURITE -->
    <div class="themed-card right-row">
      <h2 class="themed-h2">Sécurité</h2>

      <div class="security-container">

        <div class="security-item">
          <div class="security-item-info">
            <span class="material-icons security-icon">security</span>
            <div>
              <p class="security-item-title">Authentification 2FA</p>
              <p class="security-item-desc">Protégez votre compte avec une double authentification</p>
            </div>
          </div>
          <button class="themed-button button-primary">Activer</button>
        </div>

        <div class="security-separator" />

        <div class="security-item">
          <div class="security-item-info">
            <span class="material-icons security-icon">alternate_email</span>
            <div>
              <p class="security-item-title">E-mail de secours</p>
              <p class="security-item-desc">Utilisé pour récupérer votre compte</p>
            </div>
          </div>
          <button class="themed-button button-secondary">Ajouter</button>
        </div>

        <div class="security-separator" />

        <div class="security-item danger-item">
          <div class="security-item-info">
            <span class="material-icons security-icon danger-icon">delete_forever</span>
            <div>
              <p class="security-item-title danger-text">Supprimer le compte</p>
              <p class="security-item-desc">Cette action est irréversible</p>
            </div>
          </div>
          <button class="themed-button button-danger">Supprimer</button>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

function logout() {
  authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<style scoped>
.profil-container {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 1.5rem;
  color: white;
  align-items: stretch;
}

/* COLONNES */
.left-row,
.middle-row,
.right-row {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  height: 100%;
}

.profil-container > .themed-card {
  padding-left: 1.5rem;
}

.themed-h2 {
  text-align: center;
  margin-bottom: 1.5rem;
}

/* INFO */
.info-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.profil-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 1rem;
}

.icon-btn {
  padding: 4px 8px;
  display: flex;
  align-items: center;
}

.icon-btn .material-icons {
  font-size: 1.1rem;
}

/* LOGOUT */
.logout-container {
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* SECURITE */
.security-container {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0;
}

.security-item-info {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.security-icon {
  font-size: 1.8rem;
  opacity: 0.8;
}

.security-item-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0;
}

.security-item-desc {
  font-size: 0.78rem;
  opacity: 0.6;
  margin: 2px 0 0;
}

.security-separator {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.1);
}

/* DANGER */
.danger-icon {
  color: #ff4d4d;
}

.danger-text {
  color: #ff4d4d;
}

.button-danger {
  background-color: #ff4d4d;
  color: white;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.button-danger:hover {
  background-color: #cc0000;
}
</style>