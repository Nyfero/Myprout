import { useAuthStore } from '@/stores/authStore'
import router from '@/router'

export function useInactivity(timeout = 20 * 60 * 1000) {
  const authStore = useAuthStore()
  let timer = null

  const reset = () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      await authStore.logout()
      await router.push({ name: 'Login' })
    }, timeout)
  }

  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

  const start = () => {
    events.forEach((e) => window.addEventListener(e, reset))
    reset()
  }

  const stop = () => {
    events.forEach((e) => window.removeEventListener(e, reset))
    clearTimeout(timer)
  }

  return { start, stop }
}
