<template>
  <nav class="themed-card navbar">
    <div class="container">
      <div class="flex-1">
        <div class="icon-link-wrapper">
          <router-link to="/password" class="icon-link" title="Mots de passe">
            <span class="icon material-icons">security</span>
            <span class="nav-label">Mot de passe</span>
          </router-link>
        </div>
      </div>
      <div v-if="auth.getRole === 'Admin'" class="flex-1">
        <div class="icon-link-wrapper">
          <router-link to="/admin" class="icon-link" title="Administration">
            <span class="icon material-icons">admin_panel_settings</span>
            <span class="nav-label">Administration</span>
          </router-link>
        </div>
      </div>
      <div class="flex-1">
        <div class="icon-link-wrapper">
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
  height: 56px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  margin: 8px 15px;
}

.container {
  height: 100%;
  width: 100%;
  margin: 12px 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rem;
}

.icon-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-decoration: none;
  cursor: pointer;
  padding: 0 0.5rem;
}

.icon-link .icon {
  font-size: 1.8rem;
  transition:
    font-size 0.18s,
    color 0.2s;
  line-height: 1;
}

.icon-link .nav-label {
  font-size: 0.8em;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition:
    opacity 0.16s,
    max-height 0.16s;
  margin-top: 0.2em;
  color: #fff;
  white-space: nowrap;
}

.icon-link:hover .icon {
  color: #c25fff;
}

.icon-link:hover .nav-label {
  opacity: 1;
  max-height: 2em;
  color: #fff;
  text-shadow: 0px 0px 3px #c25fff;
}

.icon-link.router-link-exact-active .icon {
  color: #c25fff;
}

.icon-link.router-link-exact-active .nav-label {
  opacity: 1;
  max-height: 2em;
  color: #c25fff;
  text-shadow: 0px 0px 3px #c25fff;
  transition: 0.2s;
}

.icon-link-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icon-link-wrapper .nav-label {
  pointer-events: none;
  font-size: 0.8em;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition:
    opacity 0.16s,
    max-height 0.16s;
  margin-top: 0.2em;
  color: #fff;
  white-space: nowrap;
}

.icon-link.router-link-exact-active + .nav-label {
  opacity: 1;
  max-height: 2em;
  color: #c25fff;
  text-shadow: 0px 0px 3px #c25fff;
}
</style>
