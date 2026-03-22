<template>
  <div class="modal-overlay">

    <div class="themed-card modal">

      <!-- Header -->
      <div class="modal-header">

        <div class="modal-header-empty"></div>

        <div class="modal-header-title">
          <h2 class="themed-h2">
            {{ modalMode === 'create' ? 'Nouveau mot de passe' 
            : modalMode === 'edit' ? 'Modifier' 
            : localForm.title }}
          </h2>
        </div>

        <div class="modal-header-actions">
          <button class="modal-close" @click="$emit('close')">
            <span class="material-icons">close</span>
          </button>
        </div>

      </div>

      <!-- Body -->
      <div class="modal-form">

        <!-- Titre -->
        <div class="form-group">
          <label class="themed-label">Titre</label>
          <input 
            v-if="modalMode !== 'view'" 
            class="themed-input" 
            v-model="localForm.title" 
            type="text" 
            placeholder="Google, Youtube..."
            required 
          />
          <span v-else class="form-value">{{ localForm.title }}</span>
        </div>

        <!-- Username -->
        <div class="form-group">
          <label class="themed-label">Nom d'utilisateur</label>
          <input 
            v-if="modalMode !== 'view'" 
            class="themed-input" 
            v-model="localForm.username" 
            type="text" 
            placeholder="email@exemple.com"
          />
          <div v-else class="input-copy-wrapper">
            <span class="form-value">{{ localForm.username || '—' }}</span>
            <div class="password-actions">
              <button 
                class="copy-btn" 
                @click="copyToClipboard(localForm.username, 'username')" 
                title="Copier"
              >
                <span class="material-icons">{{ copied === 'username' ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Password -->
        <div class="form-group">
          <label class="themed-label">Mot de passe</label>
          <div class="input-password-wrapper">
            <input 
              v-if="modalMode !== 'view'"
              class="themed-input" 
              v-model="localForm.password" 
              :type="showPassword ? 'text' : 'password'"
              required
            />
            <span v-else class="form-value password-value">{{ showPassword ? localForm.password : '••••••••' }}</span>
            <div class="password-actions">
              <button 
                class="toggle-password" 
                @click="showPassword = !showPassword"
              >
                <span class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
              <button 
                v-if="modalMode !== 'view'" 
                class="copy-btn" 
                @click="generatePassword" 
                title="Générer"
              >
                <span class="material-icons">casino</span>
              </button>
              <button 
                v-if="modalMode === 'view'" 
                class="copy-btn" 
                @click="copyToClipboard(localForm.password, 'password')" 
                title="Copier"
              >
                <span class="material-icons">{{ copied === 'password' ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
          </div>
        </div>

      <!-- Note -->
      <div class="form-group">
        <label class="themed-label">Note</label>
        <textarea 
          v-if="modalMode !== 'view'"
          class="themed-textarea"
          v-model="localForm.note" 
          rows="3" 
          placeholder="Note optionnelle..." 
          maxlength="300"
        />
        <span v-else class="form-value">{{ localForm.note || '—' }}</span>
        <span v-if="modalMode !== 'view'" class="char-counter" :class="{ 'near-limit': localForm.note?.length >= 270 }">
          {{ localForm.note?.length || 0 }}/300
        </span>
      </div>

        <p v-if="error" class="form-error">{{ error }}</p>
      </div>

      <!-- Footer -->

      <!-- Mode edition -->
      <div class="modal-footer">
        <div class="modal-footer-left" v-if="modalMode === 'edit'" >
          <button class="themed-button button-secondary btn-delete" @click="$emit('delete')" title="Supprimer">
            <span>Supprimer </span>
            <span class="material-icons">delete</span>
          </button>
        </div>
        <div class="modal-footer-left"></div>

        <!-- Mode creation/edition -->
        <div class="modal-footer-right" v-if="modalMode !== 'view'">
          <button class="themed-button button-secondary btn-cancel" @click="$emit('switch-mode', 'view')">Annuler</button>
          <button class="themed-button button-primary" :disabled="loading" @click="$emit('submit', localForm)">
            {{ loading ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>

        <!-- Mode vue -->
        <div class="modal-footer-right" v-else>
          <button class="themed-button button-secondary btn-edit" @click="$emit('switch-mode', 'edit')" title="Éditer">
            <span>Modifier</span>
            <span class="material-icons edit-icon">edit</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modalMode: { type: String, default: 'create' }, // 'create' | 'view' | 'edit'
  form: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit', 'delete', 'switch-mode'])

const showPassword = ref(props.modalMode !== 'view')
const localForm = ref({ ...props.form })

const copied = ref(null) // 'username' | 'password' | null

const copyToClipboard = async (text, field) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = field
    setTimeout(() => copied.value = null, 2000)
  } catch (err) {
    console.error('Erreur copie :', err)
  }
}

const generatePassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!-_=+?*.,;:'
  const all = lowercase + uppercase + numbers + symbols

  let password = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]

  for (let i = 4; i < 16; i++) {
    password.push(all[Math.floor(Math.random() * all.length)])
  }

  localForm.value.password = password
    .sort(() => Math.random() - 0.5)
    .join('')

  showPassword.value = true
}

watch(() => props.form, (val) => {
  localForm.value = { ...val }
  showPassword.value = props.modalMode !== 'view'
}, { deep: true })

watch(() => props.modalMode, (newMode) => {
  showPassword.value = newMode !== 'view'
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function isFormValid() {
  return localForm.value.title?.trim() && localForm.value.password?.trim()
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    emit('close')
  }
  if (e.key === 'Enter' && props.modalMode !== 'view' && isFormValid()) {
    emit('submit', localForm.value)
  }
}
</script>

<style scoped>

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: rgba(10, 10, 10);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
}

.modal-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  font-size: 1.2rem;
  color: #fff;
}

.modal-header-empty {
  flex: 1;
}

.modal-header-title {
  flex: 1;
  text-align: center;
}

.modal-header-actions {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.modal-close {
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 1.5rem;
  display: flex;
}
.modal-close:hover { color: #fff; }

.modal-footer {
  display: flex;
  align-items: center;
}

.modal-footer-left {
  flex: 1;
}

.modal-footer-right {
  display: flex;
  align-items: flex-end;
  gap: 0.8rem;
  margin-top: 0.5rem;
}

/* Form */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-value {
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.9rem;
  color: #fff;
}

.char-counter {
  font-size: 0.75rem;
  color: #888;
  text-align: right;
  display: block;
  margin-top: 4px;
}

.char-counter.near-limit {
  color: #e74c3c;
}

.input-copy-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-btn {
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  display: flex;
  transition: color 0.2s;
  margin-top: 0;
}
.copy-btn:hover { color: #c25fff; }

/* Button */
.btn-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 10px;
}

.edit-icon {
  margin-bottom: 5px;
}

.btn-delete {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  border: 1px solid transparent;
}
.btn-delete:hover { border: 1px solid #ff5555; color: #ff5555;}
</style>