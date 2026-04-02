<template>
  <div class="admin-users">
    <h1>Utilisateurs en attente de validation</h1>

    <div v-if="loading" class="loading">Chargement...</div>

    <div v-else-if="pendingUsers.length === 0" class="empty">
      Aucun utilisateur en attente ✅
    </div>

    <div v-else class="users-list">
      <div v-for="user in pendingUsers" :key="user.user_id" class="user-card">
        <div class="user-info">
          <span class="user-name"
            >{{ user.firstName }} {{ user.lastName }}</span
          >
          <span class="user-email">{{ user.email }}</span>
          <span class="user-date"
            >Inscrit le {{ formatDate(user.created_at) }}</span
          >
        </div>
        <div class="user-actions">
          <button
            class="btn-approve"
            @click="approveUser(user)"
            :disabled="loadingAction === user.user_id"
          >
            ✅ Valider
          </button>
          <button
            class="btn-reject"
            @click="rejectUser(user)"
            :disabled="loadingAction === user.user_id"
          >
            ❌ Refuser
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const pendingUsers = ref([])
const loading = ref(true)
const loadingAction = ref(null)

onMounted(async () => {
  await fetchPendingUsers()
})

async function fetchPendingUsers() {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    const { data } = await api.get('/admin/pending-users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    pendingUsers.value = data
  } catch (error) {
    console.error('Erreur lors du chargement des utilisateurs', error)
  } finally {
    loading.value = false
  }
}

async function approveUser(user) {
  if (!confirm(`Valider le compte de ${user.email} ?`)) return
  loadingAction.value = user.user_id
  try {
    await api.post(`/admin/approve/${user.user_id}`)
    pendingUsers.value = pendingUsers.value.filter(
      (u) => u.user_id !== user.user_id
    )
  } catch (error) {
    console.error('Erreur lors de la validation', error)
  } finally {
    loadingAction.value = null
  }
}

async function rejectUser(user) {
  if (!confirm(`Refuser et supprimer le compte de ${user.email} ?`)) return
  loadingAction.value = user.user_id
  try {
    await api.delete(`/admin/reject/${user.user_id}`)
    pendingUsers.value = pendingUsers.value.filter(
      (u) => u.user_id !== user.user_id
    )
  } catch (error) {
    console.error('Erreur lors du refus', error)
  } finally {
    loadingAction.value = null
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>

<style scoped>
.admin-users {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

h1 {
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-radius: 12px;
  background: #1e1e2e;
  border: 1px solid #2e2e3e;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.user-name {
  font-weight: 600;
  font-size: 1rem;
}

.user-email {
  color: #aaa;
  font-size: 0.9rem;
}

.user-date {
  color: #666;
  font-size: 0.8rem;
}

.user-actions {
  display: flex;
  gap: 0.8rem;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background: #22c55e;
  color: white;
}

.btn-approve:hover:not(:disabled) {
  opacity: 0.85;
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  opacity: 0.85;
}

.empty {
  color: #aaa;
  text-align: center;
  margin-top: 3rem;
}
</style>
