// authStore.js
import { defineStore } from 'pinia'
import { unlockCryptoKey } from '@/utils/crypto'
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
    async initAuth() {
      const hasSession = document.cookie.includes('hasSession=1')
      if (!hasSession) {
        this.isAuthenticated = false
        return
      }

      try {
        const { data } = await api.post(
          '/auth/refresh',
          {},
          { withCredentials: true }
        )
        this.token = data.token
        this.user = data.user
        this.isAuthenticated = true
      } catch {
        this.isAuthenticated = false
        this.token = null
        this.user = null
      }
    },
    async unlockKey(password) {
      try {
        await api.post('/auth/password/verify', { password })
        this.crypto_key = await unlockCryptoKey(
          password,
          this.user.kek_salt,
          this.user.encrypted_crypto_key
        )
      } catch (error) {
        throw error
      }
    },
    async login(userData, accessToken, cryptoKey) {
      this.isLoggingIn = true
      this.isAuthenticated = true
      this.user = userData
      this.token = accessToken
      this.crypto_key = cryptoKey
      localStorage.setItem('user', JSON.stringify(userData))
    },
    async logout() {
      try {
        await api.post('/auth/logout')
      } catch (_) {}
      this.isAuthenticated = false
      this.user = null
      this.token = null
      this.crypto_key = null
      localStorage.removeItem('user')
    },
    async initFromStorage() {
      const user = localStorage.getItem('user')
      if (!user) return

      try {
        const { data } = await api.post(
          `/auth/refresh`,
          {},
          { withCredentials: true }
        )
        this.isAuthenticated = true
        this.token = data.token
        this.user = JSON.parse(user)
      } catch (_) {
        localStorage.removeItem('user')
      }
    },
  },
})
