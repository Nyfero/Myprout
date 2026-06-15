<!--
  TEMPLATE — Composant Vue (SFC). Fichier nommé en PascalCase : MyComponent.vue
  Voir CONVENTIONS.md §9.

  Règles clés :
   - ordre des blocs : <template> puis <script setup lang="ts"> puis <style scoped>
   - <style> TOUJOURS scoped
   - logique non triviale -> composable useXxx (pas de gros bloc dans le composant)
   - props/emits déclarés et typés ; pas de commentaire mort entre les blocs
-->
<template>
  <section class="example">
    <h2 class="themed-h2">{{ title }}</h2>

    <button class="themed-button button-primary" @click="onConfirm">
      Confirmer
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Props typées
const props = defineProps<{
  title: string
}>()

// Événements émis
const emit = defineEmits<{
  (e: 'confirm'): void
}>()

const isLoading = ref(false)

function onConfirm() {
  isLoading.value = true
  emit('confirm')
  isLoading.value = false
}
</script>

<style scoped>
.example {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
</content>
