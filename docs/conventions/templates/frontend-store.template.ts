// stores/exampleStore.ts
//
// TEMPLATE — Store Pinia (Options API, comme authStore).
// Voir CONVENTIONS.md §4 (TS), §5 (structure).
//
// Règles clés :
//  - garder le style Options (state / getters / actions) déjà utilisé dans le projet
//  - les appels réseau passent par le service `api`
//  - typer le state ; pas d'URL en dur

import { defineStore } from 'pinia'
import api from '@/services/api'

interface ExampleState {
  items: Item[]
  loading: boolean
}

interface Item {
  id: number
  title: string
}

export const useExampleStore = defineStore('example', {
  state: (): ExampleState => ({
    items: [],
    loading: false,
  }),

  getters: {
    count: (state) => state.items.length,
  },

  actions: {
    async fetchItems() {
      this.loading = true
      try {
        const { data } = await api.get('/items')
        this.items = data
      } finally {
        this.loading = false
      }
    },
  },
})
</content>
