<script setup>
  import { useRoute } from 'vue-router';
  import { ref, watchEffect, computed } from "vue";
  import DustParticles from './components/DustParticles.vue'
  import Navbar from "@/components/ui/Navbar.vue"

  const route = useRoute();
  const currentPage = ref(route.path);
  const showNavbar = computed(() => route.name !== "Login")

  watchEffect(() => {
    currentPage.value = route.path;
  });
</script>

<template>
  <div id="app-container">
    <DustParticles />
    <Navbar v-if="showNavbar" />
    <div id="page-content">
      <router-view />
    </div>
  </div>
</template>

<style>
#app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#page-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
</style>