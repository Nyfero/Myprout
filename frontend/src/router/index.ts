import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import PasswordsView from '@/views/PasswordsView.vue'
import UnlockView from '@/views/UnlockView.vue'
import FilesView from '@/views/FilesView.vue'
import ProfileView from '@/views/ProfileView.vue'
import GamesView from '@/views/GamesView.vue'
import MoviesView from '@/views/MoviesView.vue'
import AdminView from '@/views/AdminView.vue'
import { useAuthStore } from '@/stores/authStore'

const routes = [
  // { path: '/', name: 'Home', component: HomeView },
  { path: '/login', name: 'Login', component: LoginView },
  {
    path: '/password',
    name: 'Password',
    component: PasswordsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/unlock',
    name: 'Unlock',
    component: UnlockView,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  // { path: '/files', name: 'Files', component: FilesView },
  // { path: '/games', name: 'Games', component: GamesView },
  // { path: '/movies', name: 'Movies', component: MoviesView },
  // catch-all pour tout le reste
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let authInitialized = false

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!authInitialized) {
    await authStore.initAuth(to.name)
    authInitialized = true
  }

  const requiresAuth = to.meta.requiresAuth

  if (requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login' })
  }

  if (requiresAuth && authStore.isLocked && to.name !== 'Unlock') {
    return next({ name: 'Unlock', query: { redirect: to.fullPath } })
  }

  if (
    (to.name === 'Login' || to.name === 'Unlock') &&
    authStore.isAuthenticated &&
    !authStore.isLocked
  ) {
    return next({ name: 'Password' })
  }

  next()
})

export default router
