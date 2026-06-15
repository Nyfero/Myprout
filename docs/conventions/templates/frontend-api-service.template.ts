// services/api.ts
//
// TEMPLATE — Client axios partagé.
// Voir CONVENTIONS.md §8 (config) et §7 (pas de code mort).
//
// Règles clés :
//  - baseURL via import.meta.env.VITE_API_URL (JAMAIS en dur)
//  - un seul intercepteur de requête (Authorization) et un de réponse (refresh 401)
//  - export default de l'instance ; pas de gros blocs commentés (cf. api.js actuel)

import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  withCredentials: true,
})

// Ajoute le token d'accès à chaque requête
api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// Rafraîchit silencieusement le token sur 401, puis rejoue la requête
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    if (
      originalRequest.url.includes('/auth/refresh') ||
      originalRequest.url.includes('/auth/login')
    ) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const authStore = useAuthStore()
        const { data } = await api.post('/auth/refresh', {})
        authStore.token = data.token
        originalRequest.headers.Authorization = `Bearer ${data.token}`
        return api(originalRequest)
      } catch (err) {
        const authStore = useAuthStore()
        await authStore.logout()
        router.push('/login')
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)

export default api
</content>
