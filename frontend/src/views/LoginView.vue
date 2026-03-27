<template>
  <div class="login-container">
    <Transition :name="transitionName" mode="out-in">
      <SetPassword v-if="showSetPassword" key="setPassword" @switch="goLogin" />
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
import SetPassword from '@/components/login/SetPassword.vue'

const showRegister = ref(false)
const showSetPassword = ref(false)
const transitionName = ref('slide-left')
const route = useRoute()

onMounted(() => {
  if (route.query.token) {
    showSetPassword.value = true
  }
})

async function goRegister() {
  setDustDirection('left', true)
  setTimeout(resetDustBoost, 800)
  transitionName.value = 'slide-left'
  showRegister.value = true
}
async function goLogin() {
  setDustDirection('right', true)
  setTimeout(resetDustBoost, 800)
  transitionName.value = 'slide-right'
  showRegister.value = false
  if (showSetPassword.value == true) {
    showSetPassword.value = false
  }
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
