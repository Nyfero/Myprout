<template>
  <div class="themed-card login-card">
    <transition name="fade" mode="out-in">
      <div :key="step">
        <!-- ==================== QUESTIONS ==================== -->
        <template v-if="step === 'questions'">
          <div class="login-header">
            <h2 class="themed-h2">
              {{
                mode === 'verify'
                  ? 'Vérification de votre identité'
                  : 'Questions de sécurité'
              }}
            </h2>
            <p class="login-subtitle">
              {{
                mode === 'verify'
                  ? 'Répondez à vos questions de sécurité pour réinitialiser votre mot de passe.'
                  : 'Ces questions permettront de récupérer votre compte si vous oubliez votre mot de passe.'
              }}
            </p>
          </div>

          <div class="login-body">
            <form @submit.prevent="handleSubmit">
              <!-- ===== MODE VERIFY : questions fixes, réponses saisies ===== -->
              <template v-if="mode === 'verify'">
                <div
                  v-for="(q, index) in securityQuestions"
                  :key="index"
                  class="question-block"
                >
                  <div class="question-label">
                    <span>{{ q.question }}</span>
                  </div>

                  <div class="form-wrapper">
                    <input
                      class="themed-input"
                      v-model="q.answer"
                      type="text"
                      placeholder="Votre réponse"
                      maxlength="30"
                      required
                    />
                    <span
                      class="char-counter"
                      :class="{ 'near-limit': q.answer?.length >= 20 }"
                    >
                      {{ q.answer?.length || 0 }}/30
                    </span>
                  </div>
                </div>
              </template>

              <!-- ===== MODE SET : questions sélectionnables ===== -->
              <template v-else>
                <div
                  v-for="(q, index) in questions"
                  :key="index"
                  class="question-block"
                >
                  <p class="question-label">Question {{ index + 1 }}</p>

                  <div class="themed-select-wrapper">
                    <select
                      class="themed-select"
                      v-model="q.selected"
                      @change="q.custom = ''"
                    >
                      <option value="" disabled>Choisir une question...</option>
                      <optgroup label="Questions prédéfinies">
                        <option
                          v-for="preset in availableQuestions(index)"
                          :key="preset"
                          :value="preset"
                        >
                          {{ preset }}
                        </option>
                      </optgroup>
                      <optgroup label="Questions personnalisées">
                        <option value="__custom__">
                          ✎ Écrire ma propre question
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  <div class="form-wrapper" v-if="q.selected === '__custom__'">
                    <input
                      class="themed-input"
                      v-model="q.custom"
                      type="text"
                      placeholder="Votre question personnalisée"
                      maxlength="80"
                      required
                    />
                    <span
                      class="char-counter"
                      :class="{ 'near-limit': q.custom?.length >= 60 }"
                    >
                      {{ q.custom?.length || 0 }}/80
                    </span>
                  </div>

                  <div class="form-wrapper">
                    <input
                      class="themed-input"
                      v-model="q.answer"
                      type="text"
                      placeholder="Votre réponse"
                      maxlength="30"
                      required
                    />
                    <span
                      class="char-counter"
                      :class="{ 'near-limit': q.answer?.length >= 20 }"
                    >
                      {{ q.answer?.length || 0 }}/30
                    </span>
                  </div>
                </div>
              </template>

              <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

              <div class="login-footer">
                <button
                  class="themed-button button-primary"
                  type="submit"
                  :disabled="isLoading"
                >
                  {{
                    isLoading
                      ? 'En cours...'
                      : mode === 'verify'
                        ? 'Vérifier'
                        : 'Valider'
                  }}
                </button>
                <button
                  v-if="mode === 'set'"
                  class="themed-button button-secondary"
                  type="button"
                  @click="$emit('back')"
                >
                  Retour
                </button>
              </div>
            </form>
          </div>
        </template>
        <!-- ==================== SUCCESS ==================== -->
        <template v-if="step === 'done'">
          <div class="login-header">
            <svg class="svg" viewBox="0 0 52 52" stroke="#4bb543">
              <circle class="svg-circle" cx="26" cy="26" r="25" fill="none" />
              <path class="svg-check" fill="none" d="M14 27l7 7 16-16" />
            </svg>
            <h2 class="themed-h2">Compte activé avec succès !</h2>
          </div>
          <div class="login-footer">
            <button
              class="themed-button button-secondary"
              @click="$emit('switch')"
            >
              Se connecter
            </button>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/services/api'
import { deriveKek, decryptCryptoKey } from '@/utils/crypto'

const props = defineProps({
  token: String,
  password: String,
  mode: {
    type: String,
    default: 'set', // 'set' | 'verify'
  },
})
const emit = defineEmits(['back', 'switch'])

const securityQuestions = ref([])

onMounted(async () => {
  if (props.mode === 'verify') {
    const loadedQuestions = []
    try {
      const response = await api.get(`/auth/recovery?token=${props.token}`)
      securityQuestions.value = response.data.questions.map((q) => ({
        question: q,
        answer: '',
      }))
    } catch (error) {
      errorMessage.value = 'Token invalide ou expiré.'
    }
  }
})

const step = ref('questions')
const isLoading = ref(false)
const errorMessage = ref('')

const PRESET_QUESTIONS = [
  'Quel est le nom de votre premier animal de compagnie ?',
  'Quelle est la ville où vous êtes né(e) ?',
  "Quel est le prénom de votre meilleur(e) ami(e) d'enfance ?",
  'Quel est le nom de votre école primaire ?',
  'Quel est le modèle de votre première voiture ?',
  'Quel est le plat préféré de votre mère ?',
  'Quel était le surnom de votre grand-père ?',
  'Quelle est la rue où vous avez grandi ?',
]

const questions = reactive([
  { selected: '', custom: '', answer: '' },
  { selected: '', custom: '', answer: '' },
  { selected: '', custom: '', answer: '' },
])

function availableQuestions(currentIndex) {
  const selectedElsewhere = questions
    .filter((q, i) => i !== currentIndex && q.selected !== '__custom__')
    .map((q) => q.selected)
  return PRESET_QUESTIONS.filter((q) => !selectedElsewhere.includes(q))
}

async function handleSubmit() {
  errorMessage.value = ''

  if (props.mode === 'set') {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.selected) {
        errorMessage.value = `Veuillez sélectionner une question pour le bloc ${i + 1}`
        return
      }
      if (q.selected === '__custom__' && !q.custom.trim()) {
        errorMessage.value = `Veuillez saisir votre question personnalisée (bloc ${i + 1})`
        return
      }
      if (!q.answer.trim()) {
        errorMessage.value = `Veuillez saisir une réponse pour la question ${i + 1}`
        return
      }
    }
  } else {
    for (let i = 0; i < securityQuestions.length; i++) {
      const sq = securityQuestions[i]
      if (!sq.answer.trim()) {
        errorMessage.value = `Veuillez saisir une réponse pour la question ${i + 1}`
        return
      }
    }
  }

  const payload = questions.map((q) => ({
    question: q.selected === '__custom__' ? q.custom.trim() : q.selected,
    answer: q.answer.trim(),
  }))

  isLoading.value = true
  try {
    if (props.mode === 'verify') {
      const response = await api.post('/auth/recovery/verify', {
        token: props.token,
        security_questions: securityQuestions.value,
      })
      const { recovery_encrypted_crypto_key, kek_salt } = response.data

      const passphrase = securityQuestions.value
        .map((q) => q.answer.toLowerCase().replace(/\s/g, '').trim())
        .join('')

      const kek = await deriveKek(passphrase, kek_salt)

      const cryptoKey = await decryptCryptoKey(
        recovery_encrypted_crypto_key,
        kek
      )
      emit('verified', { token: props.token, cryptoKey, kekSalt: kek_salt })
    } else {
      await api.post('/auth/activate', {
        token: props.token,
        password: props.password,
        security_questions: payload,
      })
      step.value = 'done'
    }
  } catch (error) {
    errorMessage.value =
      error.response?.data?.error || 'Réponses incorrectes, veuillez réessayer'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-header {
  text-align: center;
  margin-bottom: 1.5em;
}

.login-subtitle {
  font-size: 0.85em;
  color: #aaa;
  margin-top: 0.4em;
}

.login-body {
  display: flex;
  flex-direction: column;
  gap: 0.8em;
}

.login-footer {
  display: flex;
  flex-direction: column;
  gap: 0.6em;
  margin-top: 1em;
}

/* ==================== Question Block ==================== */
.question-block {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 1em;
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  margin-bottom: 0.8em;
}

.question-label {
  font-size: 0.8em;
  font-weight: 600;
  color: #aaa;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.char-counter {
  position: absolute;
  bottom: 10px;
  right: 10px;
}

.themed-input {
  padding-right: 3em;
}

.question-icon {
  font-size: 18px;
  color: var(--accent);
  flex-shrink: 0;
}

/* ==================== Select ==================== */
.themed-select-wrapper {
  position: relative;
}

.themed-select {
  width: 100%;
  appearance: none;
  background: var(--input-bg, #1e1e1e);
  color: var(--text-color, #fff);
  border: 1px solid var(--border-color, #444);
  border-radius: 6px;
  padding: 0.6em 2em 0.6em 0.8em;
  font-size: 0.9em;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23aaa'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.7em center;
}

.themed-select:focus {
  outline: none;
  border-color: var(--primary-color, #646cff);
}

/* ==================== Criteria ==================== */
.strength-criteria {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.strength-criteria li {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.8em;
  transition: color 0.3s ease;
}

.strength-criteria li.met {
  color: #4bb543;
}
.strength-criteria li.unmet {
  color: #aaa;
}

.criteria-icon {
  font-size: 0.9em;
  font-weight: 700;
  width: 14px;
  text-align: center;
}

/* ==================== SVG ==================== */
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
.svg-check {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.4s 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
@keyframes stroke {
  100% {
    stroke-dashoffset: 0;
  }
}
</style>
