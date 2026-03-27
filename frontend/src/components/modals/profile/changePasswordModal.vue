<template>
  <BaseModal @close="$emit('close')">

    <!-- Header -->
    <template #header>
      <div class="modal-header-empty" />

      <div class="modal-header-title">
        <h2 class="themed-h2">Modifier le mot de passe</h2>
      </div>

      <div class="modal-header-actions">
        <button class="modal-close" @click="$emit('close')" tabindex="-1">
          <span class="material-icons">close</span>
        </button>
      </div>
    </template>

    <!-- Body -->
    <div class="modal-form">

      <!-- Ancien mot de passe -->
      <div class="form-group">
        <label class="themed-label">Ancien mot de passe</label>
        <div class="form-wrapper">
          <input
            class="themed-input"
            v-model="form.oldPassword"
            :type="showOld ? 'text' : 'password'"
            placeholder="Votre mot de passe actuel"
            required
          />
          <div class="input-actions">
            <button class="toggle-password" @click="showOld = !showOld" tabindex="-1">
              <span class="material-icons">{{ showOld ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="themed-separator" />

      <!-- Nouveau mot de passe -->
      <div class="form-group">
        <label class="themed-label">Nouveau mot de passe</label>
        <div class="form-wrapper">
          <input
            class="themed-input"
            v-model="form.newPassword"
            :type="showNew ? 'text' : 'password'"
            placeholder="Nouveau mot de passe"
            required
          />
          <div class="input-actions">
            <button class="toggle-password" @click="showNew = !showNew" tabindex="-1">
              <span class="material-icons">{{ showNew ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>
        <!-- Indicateur de force -->
        <div v-if="form.newPassword" class="password-strength">
          <div class="strength-bar">
            <div class="strength-fill" :class="strength.class" :style="{ width: strength.percent + '%' }" />
          </div>
          <span class="strength-label" :class="strength.class">{{ strength.label }}</span>
        </div>
      </div>

      <!-- Confirmation -->
      <div class="form-group">
        <label class="themed-label">Confirmer le nouveau mot de passe</label>
        <div class="form-wrapper">
          <input
            class="themed-input"
            v-model="form.confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            placeholder="Répétez le nouveau mot de passe"
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
          class="themed-button button-primary"
          :disabled="!isFormValid || loading"
          @click="handleSubmit"
        >
          {{ loading ? 'Enregistrement...' : 'Confirmer' }}
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

const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showOld     = ref(false)
const showNew     = ref(false)
const showConfirm = ref(false)

// Correspondance des mots de passe
const passwordsMatch = computed(() =>
  form.value.newPassword === form.value.confirmPassword
)

// Indicateur de force
const strength = computed(() => {
  const p = form.value.newPassword
  if (!p) return { label: '', class: '', percent: 0 }

  let score = 0
  if (p.length >= 8)                    score++
  if (p.length >= 12)                   score++
  if (/[A-Z]/.test(p))                  score++
  if (/[0-9]/.test(p))                  score++
  if (/[^A-Za-z0-9]/.test(p))           score++

  if (score <= 2) return { label: 'Faible',  class: 'weak',   percent: 33  }
  if (score <= 3) return { label: 'Moyen',   class: 'medium', percent: 66  }
                  return { label: 'Fort',    class: 'strong', percent: 100 }
})

// Validation globale
const isFormValid = computed(() =>
  form.value.oldPassword.trim() &&
  form.value.newPassword.trim() &&
  passwordsMatch.value
)

const handleSubmit = () => {
  if (!isFormValid.value) return
  emit('submit', {
    oldPassword: form.value.oldPassword,
    newPassword: form.value.newPassword
  })
}
</script>

<style scoped>

/* Erreurs */
.field-error { font-size: 0.78rem; color: #ff5555; margin-top: 2px; }
.form-error  { font-size: 0.85rem; color: #ff5555; text-align: center; }

.input-error { border-color: #ff5555 !important; }

/* Indicateur de force */
.password-strength {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 4px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
}

.strength-label { font-size: 0.78rem; min-width: 40px;}

/* Classes de force */
.weak   { background: #ff5555; color: #ff5555; }
.medium { background: #f0a500; color: #f0a500; }
.strong { background: #2ecc71; color: #2ecc71; }
</style>
