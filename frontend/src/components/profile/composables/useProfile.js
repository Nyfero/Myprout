import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import { deriveKey, decryptPassword, encryptPassword } from '@/utils/crypto'
import api from '@/services/api'


export function useProfile() {
  const authStore = useAuthStore()
  const router = useRouter()

  const logout = () => {
    authStore.logout()
    router.push({ name: 'Login' })
  }

  const updateEmail = async (newEmail) => {
    // votre logique
  }

  async function updatePassword(oldPassword, newPassword) {
    const oldKey = await deriveKey(oldPassword, authStore.crypto_salt)
    const newKey = await deriveKey(newPassword, authStore.crypto_salt)

    const { data: passwords } = await api.get('/passwords')

    const reencryptedPasswords = await Promise.all(
      passwords.map(async (p) => {
        const decrypted = await decryptPassword(p.password, oldKey)
        const encrypted = await encryptPassword(decrypted, newKey)
        return { password_id: p.password_id, password: encrypted }
      })
    )

    await api.put('/auth/password', { oldPassword, newPassword, reencryptedPasswords })

    authStore.crypto_key = newKey
  }

  const toggle2FA = async () => {
    // votre logique
  }

  const addBackupEmail = async (email) => {
    // votre logique
  }

  async function  deleteAccount(password) {
    await api.delete('/auth/account', { data: { password } })
  }

  return {
    authStore,
    logout,
    updatePassword,
    deleteAccount,
  }
}
