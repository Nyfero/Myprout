<template>
 <h2 class="themed-h2">Sécurité</h2>

      <div class="security-container">

        <!-- <div class="security-item">
          <div class="security-item-info">
            <span class="material-icons security-icon">security</span>
            <div>
              <p class="security-item-title">Authentification 2FA</p>
              <p class="security-item-desc">Protégez votre compte avec une double authentification</p>
            </div>
          </div>
          <button class="themed-button button-primary">Activer</button>
        </div> -->

        <!-- <div class="themed-separator" /> -->

        <!-- <div class="security-item">
          <div class="security-item-info">
            <span class="material-icons security-icon">alternate_email</span>
            <div>
              <p class="security-item-title">E-mail de secours</p>
              <p class="security-item-desc">Utilisé pour récupérer votre compte</p>
            </div>
          </div>
          <button class="themed-button button-secondary">Ajouter</button>
        </div> -->

        <!-- <div class="themed-separator" /> -->

        <div class="security-item danger-item">
          <div class="security-item-info flex-2">
            <span class="material-icons security-icon danger-icon">delete_forever</span>
            <div>
              <p class="security-item-title danger-text">Supprimer le compte</p>
              <p class="security-item-desc">Cette action est irréversible</p>
            </div>
          </div>
          <button 
            class="themed-button button-danger flex-1"
            @click="openModal">
            Supprimer
          </button>
        </div>
      </div>

      <deleteAccountModal
        v-if="showDeleteAccountModal"
        :loading="formLoading"
        :error="formError"
        @close="closeModal"
        @submit="handleDeleteAccount"
      />
</template>

<script setup>
import { ref } from 'vue'
import { useProfile } from '@/components/profile/composables/useProfile'
import deleteAccountModal from '@/components/modals/profile/deleteAccountModal.vue'

const { deleteAccount, logout } = useProfile()

const showDeleteAccountModal = ref(false)
const formLoading = ref(false)
const formError = ref('')

function openModal() {
  showDeleteAccountModal.value = true
}

function closeModal() {
  showDeleteAccountModal.value = false
}

async function handleDeleteAccount(password) { 
  formLoading.value = true
  formError.value = ''

  try {
    await deleteAccount(password)
    logout()
  } catch (e) {
    console.log(e.response)
    formError.value = e.response?.data?.error || 'Une erreur est survenue'
  } finally {
    formLoading.value = false
  }
}
</script>

<style scoped>
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
  margin-right: 1.5rem;
}

.button-danger:hover {
  background-color: #cc0000;
}
</style>