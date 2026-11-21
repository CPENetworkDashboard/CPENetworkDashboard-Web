import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/** 0 when the element's top reaches the viewport top, 1 when its bottom reaches the viewport bottom. */
export function useScrollProgress(target: Ref<HTMLElement | null>) {
  const progress = ref(0)
  let frame = 0
  const measure = () => {
    frame = 0
    const element = target.value
    if (!element) return
    const rect = element.getBoundingClientRect()
    const range = rect.height - window.innerHeight
    if (rect.bottom < -200 || rect.top > window.innerHeight + 200) {
      const edge = rect.top > 0 ? 0 : 1
      if (progress.value !== edge) progress.value = edge
      return
    }
    const value = range > 0 ? -rect.top / range : rect.top < 0 ? 1 : 0
    progress.value = Math.min(1, Math.max(0, value))
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure)
  }
  onMounted(() => {
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
  })
  onUnmounted(() => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame) cancelAnimationFrame(frame)
  })
  return progress
}
