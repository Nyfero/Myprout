<template>
  <div class="login-container">
    <Transition :name="transitionName" mode="out-in">
      <Recovery
        v-if="showRecovery"
        key="recovery"
        :token="pendingToken"
        :password="pendingPassword"
        :mode="recoveryMode"
        @back="goPassword"
        @switch="goLogin"
        @verified="goPasswordReset"
      />
      <Password
        v-else-if="showPassword"
        key="password"
        :token="pendingToken"
        :mode="passwordMode"
        :cryptoKey="pendingCryptoKey"
        :kekSalt="pendingKekSalt"
        @next="goRecovery"
        @done="goLogin"
        @switch="goLogin"
      />
      <VerifyEmail
        v-else-if="showVerifyEmail"
        key="verifyEmail"
        :token="pendingToken"
        @switch="goLogin"
      />
      <Login v-else-if="!showRegister" key="login" @switch="goRegister" />
      <Register v-else key="register" @switch="goLogin" />
    </Transition>
    <span class="version">1.0.0</span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  setDustDirection,
  resetDustBoost,
} from '@/components/background/composables/useDustDirection'
import Login from '@/components/login/Login.vue'
import Register from '@/components/login/Register.vue'
import Password from '@/components/login/Password.vue'
import Recovery from '@/components/login/Recovery.vue'
import VerifyEmail from '@/components/login/VerifyEmail.vue'

const showRegister = ref(false)
const showPassword = ref(false)
const showRecovery = ref(false)
const showVerifyEmail = ref(false)
const transitionName = ref('slide-left')
const route = useRoute()

const recoveryMode = ref('set') // 'set' | 'verify'
const passwordMode = ref('set') // 'set' | 'reset'
const pendingCryptoKey = ref('')
const pendingKekSalt = ref('')

// Données transmises de Password → Recovery
const pendingToken = ref('')
const pendingPassword = ref('')

onMounted(() => {
  if (route.query.token) {
    const mode = route.query.mode // 'set' | 'reset' | 'email'
    pendingToken.value = route.query.token
    if (mode === 'reset') {
      recoveryMode.value = 'verify'
      showRecovery.value = true
    } else if (mode === 'set') {
      showPassword.value = true
    } else {
      showVerifyEmail.value = true
    }
  }
})

function goRegister() {
  setDustDirection('left', true)
  setTimeout(resetDustBoost, 800)
  transitionName.value = 'slide-left'
  showRegister.value = true
}

function goLogin() {
  setDustDirection('right', true)
  setTimeout(resetDustBoost, 800)
  transitionName.value = 'slide-right'
  showRegister.value = false
  showPassword.value = false
  showRecovery.value = false
  showVerifyEmail.value = false
  passwordMode.value = 'set'
  pendingToken.value = ''
  pendingPassword.value = ''
  pendingCryptoKey.value = ''
  pendingKekSalt.value = ''
}

function goPassword() {
  transitionName.value = 'slide-right'
  showRecovery.value = false
  showPassword.value = true
}

function goPasswordReset({ token, cryptoKey, kekSalt }) {
  pendingToken.value = token
  pendingCryptoKey.value = cryptoKey
  pendingKekSalt.value = kekSalt
  passwordMode.value = 'reset'
  transitionName.value = 'slide-left'
  showRecovery.value = false
  showPassword.value = true
}

function goRecovery({ token, password }) {
  pendingToken.value = token
  pendingPassword.value = password
  recoveryMode.value = 'set'
  transitionName.value = 'slide-left'
  showPassword.value = false
  showRecovery.value = true
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  overflow-x: hidden;
}

.version {
  position: fixed;
  bottom: 30px;
  right: 50px;
  z-index: 100;
  cursor: default;
  color: grey;
}

:deep(.login-card) {
  width: 400px;
  text-align: center;
  padding: 32px;
}

:deep(.login-button) {
  margin-top: 14px;
}

:deep(.forgot-password) {
  font-size: 0.9em;
  color: grey;
  text-decoration: underline;
  cursor: pointer;
  margin-top: 0.2em;
}

:deep(.forgot-password:hover) {
  color: #c25fff;
}

/* Slide vers la gauche (connexion -> inscription) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.6s cubic-bezier(0.6, 0.01, 0.39, 0.97);
  position: absolute;
}
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(120vw);
}
.slide-left-enter-to,
.slide-left-leave-from {
  opacity: 1;
  transform: translateX(0);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-120vw);
}

/* Slide vers la droite (inscription -> connexion) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.6s cubic-bezier(0.6, 0.01, 0.39, 0.97);
  position: absolute;
}
.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-120vw);
}
.slide-right-enter-to,
.slide-right-leave-from {
  opacity: 1;
  transform: translateX(0);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(120vw);
}

/* Transition Login <=> Forgot password */

:deep(.fade-enter-active, .fade-leave-active) {
  transition: opacity 0.5s;
}
:deep(.fade-enter-from, .fade-leave-to) {
  opacity: 0;
}
:deep(.fade-enter-to, .fade-leave-from) {
  opacity: 1;
}
</style>
