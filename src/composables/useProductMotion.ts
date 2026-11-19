import { onMounted, onUnmounted, type Ref } from 'vue'

export function useProductMotion(root: Ref<HTMLElement | null>) {
  let observer: IntersectionObserver | undefined
  onMounted(() => {
    if (
      !root.value ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add('is-present')
            observer?.unobserve(entry.target)
          }
      },
      { threshold: 0.12 }
    )
    for (const element of root.value.querySelectorAll<HTMLElement>('[data-reveal]')) {
      if (element.getBoundingClientRect().top < window.innerHeight) continue
      element.classList.add('has-reveal')
      observer.observe(element)
    }
  })
  onUnmounted(() => observer?.disconnect())
}
