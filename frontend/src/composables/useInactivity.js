import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router';

export function useInactivity(timeout = 20 * 60 * 1000) {
  const authStore = useAuthStore()
  const router = useRouter()
  let timer = null

  const reset = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      authStore.logout()
      router.push({ name: 'Login' })
    }, timeout)
  }

  const start = () => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset))
    reset()
  }

  const stop = () => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.removeEventListener(e, reset))
    clearTimeout(timer)
  }

  return { start, stop }
}
