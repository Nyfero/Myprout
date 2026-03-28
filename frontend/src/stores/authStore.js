// authStore.js
import { defineStore } from 'pinia'
import { importCryptoKey, deriveKek, decryptCryptoKey } from '@/utils/crypto'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    user: null,
    token: null,
    crypto_key: null,
    isLoggingIn: false,
  }),
  getters: {
    isAdmin: (state) => {
      return state.user?.isAdmin
    },
    isLocked() {
      return this.isAuthenticated && !this.crypto_key
    },
  },
  actions: {
    async unlockKey(password) {
      try {
        await api.post('/auth/password/verify', { password })
        const response = await api.get('/auth/password/keys')
        const { kek_salt, encrypted_crypto_key } = response.data

        this.crypto_key = await unlockCryptoKey(
          password,
          kek_salt,
          encrypted_crypto_key
        )
      } catch (error) {
        throw error
      }
    },
    async login(userData, tokenData, cryptoKey) {
      this.isLoggingIn = true
      this.isAuthenticated = true
      this.user = userData
      this.token = tokenData
      this.crypto_key = cryptoKey
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('token', tokenData)
    },
    logout() {
      this.isAuthenticated = false
      this.user = null
      this.token = null
      this.crypto_key = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    // Pour restaurer la session au rechargement de la page
    initFromStorage() {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      if (token && user) {
        this.isAuthenticated = true
        this.token = token
        this.user = JSON.parse(user)
      }
    },
  },
})
