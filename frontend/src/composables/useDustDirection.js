import { ref } from 'vue'

export const dustDirection = ref('left')
export const dustBoost = ref(false) // <- Pour activer le boost
export function setDustDirection(dir, boost = false) {
  dustDirection.value = dir
  dustBoost.value = boost
}
export function resetDustBoost() {
  dustBoost.value = false
}