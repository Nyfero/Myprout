import { ref, computed, watch, onMounted } from 'vue'
import { encryptPassword, decryptPassword } from '@/utils/crypto'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

export function usePasswords() {
  const authStore = useAuthStore()
  const passwordsList = ref([])
  const loading = ref(true)
  const search = ref('')
  const visiblePasswords = ref([])
  const decryptedCache = ref({})
  const icons = ref({})

  const filteredPasswords = computed(() => {
    if (!search.value) return passwordsList.value
    return passwordsList.value.filter(p =>
      p.title.toLowerCase().includes(search.value.toLowerCase()) ||
      p.username?.toLowerCase().includes(search.value.toLowerCase())
    )
  })

  const groupedPasswords = computed(() => {
    const groups = {}
    filteredPasswords.value.forEach(password => {
      const letter = password.title[0].toUpperCase()
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(password)
    })
    return Object.keys(groups).sort().map(letter => ({ letter, passwords: groups[letter] }))
  })

  const extractDomain = (value) => {
    if (!value) return null
    let domain = value.trim().toLowerCase()
    if (value.startsWith('http')) domain = new URL(value).hostname
    if (!domain.includes('.')) domain = `${domain}.com`
    return domain
  }

  const isValidDomain = (domain) => {
    return domain && domain.length > 4 && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)
  }

  const loadIcon = async (title) => {
    const domain = extractDomain(title)
    if (!domain || !isValidDomain(domain) || icons.value[domain] !== undefined) return
    const url = `/api/passwords/logo?domain=${domain}`
    const response = await fetch(url)
    icons.value[domain] = response.ok ? url : null
  }

  watch(passwordsList, (newPasswords) => {
    newPasswords.forEach(p => loadIcon(p.title))
  }, { immediate: true })

  async function fetchPasswordsList() {
    loading.value = true
    try {
      const { data } = await api.get('/passwords')
      passwordsList.value = data
    } catch (error) {
      console.error('Erreur lors du chargement des mots de passe', error)
    } finally {
      loading.value = false
    }
  }

  async function toggleFavorite(id) {
    const password = passwordsList.value.find(p => p.password_id === id)
    if (!password) return
    password.is_stared = !password.is_stared
    try {
      await api.patch(`/passwords/${id}/is_stared`, { is_stared: password.is_stared })
    } catch {
      password.is_stared = !password.is_stared
    }
  }

  async function toggleShowPassword(password_id) {
    if (visiblePasswords.value.includes(password_id)) {
      visiblePasswords.value = visiblePasswords.value.filter(id => id !== password_id)
    } else {
      const entry = passwordsList.value.find(p => p.password_id === password_id)
      if (!decryptedCache.value[password_id]) {
        decryptedCache.value[password_id] = await decryptPassword(entry.password, authStore.crypto_key)
      }
      visiblePasswords.value.push(password_id)
    }
  }

  async function decryptForCopy(encryptedPassword) {
    return await decryptPassword(encryptedPassword, authStore.crypto_key)
  }

  async function createPassword(formData) {
    const encryptedPassword = await encryptPassword(formData.password, authStore.crypto_key)
    const payload = { ...formData, password: encryptedPassword }
    const { data } = await api.post('/passwords', payload)
    passwordsList.value.push(data)
  }

  async function updatePassword(id, formData) {
    const encryptedPassword = await encryptPassword(formData.password, authStore.crypto_key)
    const payload = { ...formData, password: encryptedPassword }
    const { data } = await api.put(`/passwords/${id}`, payload)
    const index = passwordsList.value.findIndex(p => p.password_id === id)
    if (index !== -1) passwordsList.value[index] = data
  }

  async function deletePassword(id) {
    await api.delete(`/passwords/${id}`)
    passwordsList.value = passwordsList.value.filter(p => p.password_id !== id)
  }

  onMounted(fetchPasswordsList)

  return {
    passwordsList, loading, search, visiblePasswords,
    decryptedCache, icons, filteredPasswords, groupedPasswords,
    extractDomain, toggleFavorite, toggleShowPassword,
    decryptForCopy, createPassword, updatePassword, deletePassword
  }
}
