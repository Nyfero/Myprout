<template>
  <nav class="themed-card navbar">
    <div class="container">
      <div class="nav-links">
        <div>
          <router-link to="/password" class="icon-link" title="Mots de passe">
            <span class="icon material-icons">security</span>
            <span class="nav-label">Mot de passe</span>
          </router-link>
        </div>
        <div v-if="auth.isAdmin">
          <router-link to="/admin" class="icon-link" title="Administration">
            <span class="icon material-icons">admin_panel_settings</span>
            <span class="nav-label">Administration</span>
          </router-link>
        </div>
        <div>
          <router-link to="/profile" class="icon-link" title="Profil">
            <span class="icon material-icons">person</span>
            <span class="nav-label">Profil</span>
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>
<!-- <div>
  <router-link to="/" class="icon-link" title="Accueil">
    <span class="icon material-icons">dashboard</span>
    <span class="nav-label">Accueil</span>
  </router-link>
</div>
<div>
  <router-link to="/files" class="icon-link" title="Fichiers/Dossiers">
    <span class="icon material-icons">drive_folder_upload</span>
    <span class="nav-label">Stockage</span>
  </router-link>
</div>
<div>
  <router-link to="/movies" class="icon-link" title="Films">
    <span class="icon material-icons">movie</span>
    <span class="nav-label">Films</span>
  </router-link>
</div>
<div>
  <router-link to="/games" class="icon-link" title="Jeux">
    <span class="icon material-icons">videogame_asset</span>
    <span class="nav-label">Jeux</span>
  </router-link>
</div>-->

<script setup>
  import { useAuthStore } from '@/stores/authStore'

  const auth = useAuthStore()
</script>

<style scoped>
.navbar {
  margin: 8px 15px;
  height: 60px;
}

.container {
  max-width: 1200px;
  margin: auto;
  width: 100%;
}

.nav-links {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.icon-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
  text-decoration: none;
  cursor: pointer;
  position: relative;
  min-width: 56px; /* pour de l’espace horizontal constant */
  min-height: 58px; /* Assez pour icône + texte */
  justify-content: flex-start;
}

.icon-link .icon {
  font-size: 2.1rem;
  transition: font-size 0.18s, color 0.2s;
  line-height: 1;
}

.icon-link .nav-label {
  font-size: 0.96em;
  opacity: 0;
  transition: opacity 0.16s;
  height: 1.6em; /* <--- Réserve la hauteur ! */
  margin-top: 0.2em;
  display: block;
  color: #fff;
  overflow: hidden;
}

.icon-link:hover .icon {
  font-size: 1.3rem;
  color: #c25fff;
}

.icon-link:hover .nav-label {
  opacity: 1;
  color: #fff;
  text-shadow: 0px 0px 3px #c25fff;
}

.icon-link.router-link-exact-active .icon {
  color: #c25fff;
}

.icon-link.router-link-exact-active .nav-label {
  color: #c25fff;
}

</style>
