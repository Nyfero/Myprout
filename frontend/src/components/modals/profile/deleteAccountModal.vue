<template>
  <BaseModal @close="$emit('close')">

    <!-- Header -->
    <template #header>
      <div class="modal-header-empty" />

      <div class="modal-header-title">
        <h2 class="themed-h2">Supprimer le compte</h2>
      </div>

      <div class="modal-header-actions">
        <button class="modal-close" @click="$emit('close')" tabindex="-1">
          <span class="material-icons">close</span>
        </button>
      </div>
    </template>

    <!-- Body -->
    <div class="modal-form">

      <div class="delete-warning">
        <span class="material-icons warning-icon">warning</span>
        <p class="themed-label">Cette action est <strong>irréversible</strong>. Toutes vos données seront définitivement supprimées.</p>
      </div>

      <div class="themed-separator" />

      <!-- Mot de passe -->
      <div class="form-group">
        <label class="themed-label">Mot de passe maître</label>
        <div class="form-wrapper">
          <input
            class="themed-input"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Votre mot de passe actuel"
            required
          />
          <div class="input-actions">
            <button class="toggle-password" @click="showPassword = !showPassword" tabindex="-1">
              <span class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Confirmation mot de passe -->
      <div class="form-group">
        <label class="themed-label">Confirmer le mot de passe maître</label>
        <div class="form-wrapper">
          <input
            class="themed-input"
            v-model="form.confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            placeholder="Répétez votre mot de passe"
            :class="{ 'input-error': form.confirmPassword && !passwordsMatch }"
            required
          />
          <div class="input-actions">
            <button class="toggle-password" @click="showConfirm = !showConfirm" tabindex="-1">
              <span class="material-icons">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>
        <span v-if="form.confirmPassword && !passwordsMatch" class="field-error">
          Les mots de passe ne correspondent pas
        </span>
      </div>

      <!-- Erreur globale -->
      <p v-if="error" class="form-error">{{ error }}</p>

    </div>

    <!-- Footer -->
    <template #footer>
      <div class="modal-footer-left"></div>

      <div class="modal-footer-right">
        <button class="themed-button button-secondary" @click="$emit('close')">
          Annuler
        </button>
        <button
          class="themed-button button-danger"
          :disabled="!isFormValid || loading"
          @click="handleSubmit"
        >
          {{ loading ? 'Suppression...' : 'Supprimer définitivement' }}
        </button>
      </div>
    </template>

  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  error:   { type: String,  default: '' }
})

const emit = defineEmits(['close', 'submit'])

const form = ref({ password: '', confirmPassword: '' })
const showPassword = ref(false)
const showConfirm = ref(false)

const passwordsMatch = computed(() => form.value.password === form.value.confirmPassword)

const isFormValid = computed(() =>
  form.value.password.length > 0 &&
  form.value.confirmPassword.length > 0 &&
  passwordsMatch.value
)

async function handleSubmit() {
  if (!isFormValid.value) return
  emit('submit', form.value.password)
}
</script>

<style scoped>
.delete-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: color-mix(in srgb, var(--color-danger, #e53e3e) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-danger, #e53e3e) 30%, transparent);
}

.warning-icon {
  color: var(--color-danger, #e53e3e);
  font-size: 24px;
  flex-shrink: 0;
}

.button-danger {
  background-color: var(--color-danger, #e53e3e);
  color: white;
}

.button-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
