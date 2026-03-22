// authStore.js
import { defineStore } from 'pinia'
import { deriveKey } from '@/utils/crypto'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    user: null,
    token: null,
    crypto_key: null,
    crypto_salt: localStorage.getItem('crypto_salt') || null,
    isLoggingIn: false,
  }),
  getters: {
    isAdmin: (state) => {
      return state.user?.isAdmin
    }
  },
  actions: {
    async unlockKey(password) {
      const response = await api.post('/auth/verify-password', {
        email: this.user.email,
        password
      });
      const key = await deriveKey(password, this.crypto_salt);
      this.crypto_key = key;
    },
    async login(userData, tokenData, password, crypto_salt) {
      this.isLoggingIn = true
      this.isAuthenticated = true
      this.user = userData
      this.token = tokenData
      this.crypto_key = await deriveKey(password, crypto_salt)
      this.crypto_salt = crypto_salt
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('token', tokenData)
      localStorage.setItem('crypto_salt', crypto_salt) 
      this.isLoggingIn = false 
    },
    logout() {
      this.isAuthenticated = false
      this.user = null
      this.token = null
      this.crypto_key = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('crypto_salt') 

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
    }
  }
})
