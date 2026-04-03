import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import api from '@/services/api'

export function useProfile() {
  const authStore = useAuthStore()
  const router = useRouter()

  const logout = async () => {
    await authStore.logout()
    router.push({ name: 'Login' })
  }

  async function updatePassword(oldPassword, newPassword) {
    try {
      await api.post('/auth/password/verify', { password: oldPassword })
    } catch (error) {
      throw error
    }

    const response = await api.put('/auth/password', {
      oldPassword,
      newPassword,
    })

    const { encryptedCryptoKey } = response.data
    authStore.user.encrypted_crypto_key = encryptedCryptoKey
    localStorage.setItem('user', JSON.stringify(authStore.user))
  }

  async function deleteAccount(password) {
    await api.delete('/auth/account', { data: { password } })
  }

  return {
    authStore,
    logout,
    updatePassword,
    deleteAccount,
  }
}
