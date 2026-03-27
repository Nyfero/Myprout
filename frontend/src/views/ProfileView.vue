<template>
  <div class="profile-container">

    <!-- PROFIL -->
    <div class="themed-card left-row">
      <Profile />
    </div>

    <!-- GESTION DU COMPTE -->
    <div class="themed-card middle-row">
      <ManagedAccount />
    </div>

    <!-- SECURITE -->
    <div class="themed-card right-row">
      <Security />
    </div>

  </div>
</template>

<script setup>
import Profile from '@/components/profile/profile.vue'
import ManagedAccount from '@/components/profile/managedAccount.vue'
import Security from '@/components/profile/security.vue'
</script>

<style scoped>
.profile-container {
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

.profile-container > .themed-card {
  padding: 0 1.5rem;
}

:deep(.themed-h2) {
  text-align: center;
  margin-bottom: 1.5rem;
}

/* INFO */
:deep(.info-container) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

:deep(.profil-info) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.info-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 1rem;
}
</style>