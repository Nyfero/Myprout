import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import LoginView from '@/views/LoginView.vue';
import PasswordsView from '@/views/PasswordsView.vue';
import UnlockView from '@/views/UnlockView.vue';
import FilesView from '@/views/FilesView.vue';
import ProfileView from '@/views/ProfileView.vue';
import GamesView from '@/views/GamesView.vue';
import MoviesView from '@/views/MoviesView.vue';
import AdminView from '@/views/AdminView.vue';
import { useAuthStore } from '@/stores/authStore';

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/password', name: 'Password', component: PasswordsView, meta: { requireAuth: true } },
  { path: '/admin', name: 'Admin', component: AdminView, meta: { requireAuth: true, requiresAdmin: true } },
  { path: '/unlock', name: 'Unlock', component : UnlockView, meta: { requireAuth: true } },
  // { path: '/files', name: 'Files', component: FilesView },
  // { path: '/games', name: 'Games', component: GamesView },
  { path: '/profile', name: 'Profile', component: ProfileView },
  // { path: '/movies', name: 'Movies', component: MoviesView },
  // catch-all pour tout le reste
  { path: '/:pathMatch(.*)*', redirect: '/password' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;

  if (to.name === '*' && !isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'Password' });
  } else if (to.name === 'Password' && authStore.token && !authStore.crypto_key && !authStore.isLoggingIn) {
    next({ name: 'Unlock' });
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'Password' });
  } else {
    next();
  }
});


export default router;
