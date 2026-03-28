// composables/usePasswords.js
import { ref, computed, watch, onMounted } from 'vue'
import { encryptPassword, decryptPassword } from '@/utils/crypto'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

export function usePasswords() {
  const authStore = useAuthStore()
  const passwordsList = ref([])
  const loading = ref(false)
  const search = ref('')
  const visiblePasswords = ref({}) // { password_id: decryptedText }
  const icons = ref({})

  // ─── Filtrage & groupage ─────────────────────────────────────────────────────

  const filteredPasswords = computed(() => {
    if (!search.value) return passwordsList.value
    const q = search.value.toLowerCase()
    return passwordsList.value.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q)
    )
  })

  const groupedPasswords = computed(() => {
    const groups = {}
    filteredPasswords.value.forEach((p) => {
      const letter = p.title[0].toUpperCase()
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(p)
    })
    return Object.keys(groups)
      .sort()
      .map((letter) => ({
        letter,
        passwords: groups[letter],
      }))
  })

  // ─── Icônes ──────────────────────────────────────────────────────────────────

  const extractDomain = (value) => {
    if (!value) return null
    try {
      let domain = value.trim().toLowerCase()
      if (value.startsWith('http')) domain = new URL(value).hostname
      if (!domain.includes('.')) domain = `${domain}.com`
      return domain
    } catch {
      return null
    }
  }

  const isValidDomain = (domain) => {
    return (
      domain && domain.length > 4 && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)
    )
  }

  const loadIcon = async (title) => {
    const domain = extractDomain(title)
    if (!domain || !isValidDomain(domain)) {
      icons.value[title] = null
      return
    }
    try {
      const { data } = await api.get(`/passwords/logo?domain=${domain}`, {
        responseType: 'blob',
      })
      icons.value[title] = URL.createObjectURL(data)
    } catch {
      icons.value[title] = null
    }
  }

  watch(
    filteredPasswords,
    (list) => {
      list.forEach((p) => {
        if (!(p.title in icons.value)) loadIcon(p.title)
      })
    },
    { immediate: true }
  )

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async function fetchPasswordsList() {
    loading.value = true
    try {
      const { data } = await api.get('/passwords')
      passwordsList.value = data
    } catch (error) {
      console.error('Erreur chargement mots de passe', error)
    } finally {
      loading.value = false
    }
  }

  async function createPassword(formData) {
    const encrypted = await encryptPassword(
      formData.password,
      authStore.crypto_key
    )
    const { data } = await api.post('/passwords', {
      ...formData,
      password: encrypted,
    })
    passwordsList.value.push(data)
  }

  async function updatePassword(id, formData) {
    const encrypted = await encryptPassword(
      formData.password,
      authStore.crypto_key
    )
    const { data } = await api.put(`/passwords/${id}`, {
      ...formData,
      password: encrypted,
    })
    const index = passwordsList.value.findIndex((p) => p.password_id === id)
    if (index !== -1) passwordsList.value[index] = data
  }

  async function deletePassword(id) {
    await api.delete(`/passwords/${id}`)
    passwordsList.value = passwordsList.value.filter(
      (p) => p.password_id !== id
    )
    delete visiblePasswords.value[id]
  }

  async function toggleFavorite(id) {
    const password = passwordsList.value.find((p) => p.password_id === id)
    if (!password) return
    password.is_stared = !password.is_stared
    try {
      await api.patch(`/passwords/${id}/is_stared`, {
        is_stared: password.is_stared,
      })
    } catch {
      password.is_stared = !password.is_stared
    }
  }

  // ─── Déchiffrement ───────────────────────────────────────────────────────────

  async function toggleShowPassword(password_id) {
    if (visiblePasswords.value[password_id] !== undefined) {
      delete visiblePasswords.value[password_id]
      return
    }

    if (!authStore.crypto_key) {
      console.error('Clé crypto absente, session verrouillée ?')
      return
    }

    const entry = passwordsList.value.find((p) => p.password_id === password_id)
    if (!entry) return

    try {
      visiblePasswords.value[password_id] = await decryptPassword(
        entry.password,
        authStore.crypto_key
      )
    } catch (e) {
      console.error(`Échec déchiffrement pour password_id=${password_id}`, e)
    }
  }

  async function decryptForCopy(encryptedPassword) {
    if (!authStore.crypto_key) throw new Error('Clé crypto absente')
    return await decryptPassword(encryptedPassword, authStore.crypto_key)
  }

  onMounted(fetchPasswordsList)

  return {
    passwordsList,
    loading,
    search,
    visiblePasswords,
    icons,
    filteredPasswords,
    groupedPasswords,
    extractDomain,
    toggleFavorite,
    toggleShowPassword,
    decryptForCopy,
    createPassword,
    updatePassword,
    deletePassword,
    fetchPasswordsList,
  }
}
