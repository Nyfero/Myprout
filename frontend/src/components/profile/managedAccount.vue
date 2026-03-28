<template>
  <h2 class="themed-h2">Gestion du compte</h2>

  <div class="info-container">
    <div class="profil-info">
      <label class="themed-label">E-mail</label>
      <div class="info-row" v-if="authStore.user">
        <span>{{ authStore.user.email }}</span>
        <!-- <button class="themed-button button-secondary icon-btn" title="Modifier">
          <span class="material-icons">edit</span>
        </button> -->
      </div>
    </div>

    <div class="profil-info">
      <label class="themed-label">Mot de passe</label>
      <div class="info-row">
        <span class="flex-2">••••••••</span>
        <button
          class="themed-button button-secondary flex-1 edit-btn"
          title="Modifier"
          @click="openModal"
        >
          <span>Modifier</span>
          <span class="material-icons">edit</span>
        </button>
      </div>
    </div>

    <Toast ref="toastRef" />
  </div>
  <ChangePasswordModal
    v-if="showChangePasswordModal"
    :loading="formLoading"
    :error="formError"
    @close="closeModal"
    @submit="handleChangePassword"
  />
</template>

<script setup>
import { ref } from 'vue'
import { useProfile } from '@/components/profile/composables/useProfile'
import ChangePasswordModal from '@/components/modals/profile/changePasswordModal.vue'
import Toast from '../ui/Toast.vue'

const { authStore, updatePassword } = useProfile()
const toastRef = ref(null)

const showChangePasswordModal = ref(false)
const formLoading = ref(false)
const formError = ref('')

function openModal() {
  showChangePasswordModal.value = true
}

function closeModal() {
  showChangePasswordModal.value = false
}

async function handleChangePassword(formData) {
  formLoading.value = true
  formError.value = ''

  try {
    await updatePassword(formData.oldPassword, formData.newPassword)
    closeModal()
    toastRef.value?.show('Mot de passe modifié')
  } catch (e) {
    formError.value =
      e.response?.data?.message || 'Ancien mot de passe incorrect.'
  } finally {
    formLoading.value = false
  }
}
</script>

<style scoped>
.edit-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.edit-btn .material-icons {
  font-size: 1.1rem;
}
</style>
