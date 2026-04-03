/**
 * Heuristic touch / coarse-pointer detection for disabling hover tooltips on phones/tablets.
 * Safe to call during SSR (returns false without window).
 * @returns {boolean}
 */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
