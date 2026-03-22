<template>
   <div class="home-layout">
    <div class="left-column">
      <section class="themed-card top-section">
        <!-- Section 1 (ex : infos, menu, etc) -->
        Section de haut
      </section>
      <section class="themed-card bottom-section">
        <!-- Section 2 (ex : raccourcis, stats, etc) -->
        Section de bas
      </section>
    </div>
    <section class="themed-card main-section">
      <!-- Section principale (ex : tableau, contenus, etc) -->
      Section principale (prend toute la hauteur et largeur restantes)
    </section>
  </div>
</template>

<script>
export default {
  name: "HomeView",
};
</script>

<style scoped>
.home-layout {
  display: grid;
  grid-template-columns: 600px 1fr;
  grid-gap: 20px;
  height: calc(100vh - 60px);
  padding: 30px;
  box-sizing: border-box;
}
.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}
.top-section, .bottom-section {
  padding: 20px;
  border-radius: 14px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}
.top-section { flex: 1; }         /* Premier bloc (optionnel : ajuster hauteur) */
.bottom-section { flex: 2; }      /* Deuxième bloc (même hauteur que top) */

.main-section {
  padding: 25px;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  min-height: 0;   /* Pour éviter les débordements */
  overflow: auto;
}


@media (max-width: 900px) {
  .home-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }
  .left-column {
    flex-direction: row;
    gap: 10px;
  }
  .main-section {
    margin-top: 20px;
  }
}
</style>