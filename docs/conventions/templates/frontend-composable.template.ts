// composables/useExample.ts
//
// TEMPLATE — Composable Vue. Nom = camelCase préfixé `use`.
// Voir CONVENTIONS.md §4 (TS), §5 (structure).
//
// Règles clés :
//  - retourne un objet figé d'état réactif + fonctions
//  - les appels réseau passent par le service `api` (jamais fetch en dur sur une URL)
//  - regrouper par thème avec les séparateurs ─── ... ───
//  - typer les paramètres et le retour

import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

export function useExample() {
  const authStore = useAuthStore()

  // ─── État ──────────────────────────────────────────────────────────────────
  const items = ref<Item[]>([])
  const loading = ref(false)
  const search = ref('')

  // ─── Dérivé ────────────────────────────────────────────────────────────────
  const filtered = computed(() =>
    items.value.filter((i) =>
      i.title.toLowerCase().includes(search.value.toLowerCase())
    )
  )

  // ─── Actions ───────────────────────────────────────────────────────────────
  async function fetchItems() {
    loading.value = true
    try {
      const { data } = await api.get('/items')
      items.value = data
    } catch (error) {
      console.error('Erreur chargement items', error)
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    search,
    filtered,
    fetchItems,
  }
}

interface Item {
  id: number
  title: string
}
</content>
