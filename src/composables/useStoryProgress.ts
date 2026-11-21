import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useScrollProgress } from './useScrollProgress'

/**
 * Progress of a pinned story section that plays forward on its own once the reader arrives.
 * Scrolling moves it with the reader: forward to speed up or skip, back to rewind.
 */
export function useStoryProgress(
  target: Readonly<Ref<HTMLElement | null>>,
  duration: number,
  options: { delay?: number; canStart?: () => boolean } = {}
) {
  const scroll = useScrollProgress(target)
  const progress = ref(0)
  let frame = 0
  let last = 0
  let holdUntil = 0
  let reduce = false

  const inView = () => {
    const rect = target.value?.getBoundingClientRect()
    if (!rect) return false
    const vh = window.innerHeight
    return rect.top < vh * 0.3 && rect.bottom > vh * 0.7 && (options.canStart?.() ?? true)
  }
  const tick = (now: number) => {
    frame = 0
    // With reduced motion the story only follows the scroll position.
    if (reduce || !inView() || progress.value >= 1 || document.hidden) {
      last = 0
      return
    }
    const dt = last ? Math.min(now - last, 64) : 0
    last = now
    if (now >= holdUntil) progress.value = Math.min(1, progress.value + dt / duration)
    frame = requestAnimationFrame(tick)
  }
  const run = () => {
    if (!frame && progress.value < 1 && inView()) frame = requestAnimationFrame(tick)
  }

  watch(scroll, (value, previous) => {
    const delta = value - previous
    let next = progress.value + delta
    if (delta < 0) holdUntil = performance.now() + 1200
    if (value <= 0 && (target.value?.getBoundingClientRect().top ?? 0) > window.innerHeight * 0.6)
      next = 0
    progress.value = Math.min(1, Math.max(next, value, 0))
    run()
  })
  const onVisible = () => run()
  onMounted(() => {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    holdUntil = performance.now() + (options.delay ?? 0)
    run()
    document.addEventListener('visibilitychange', onVisible)
  })
  onUnmounted(() => {
    if (frame) cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', onVisible)
  })
  return { progress, scroll }
}
