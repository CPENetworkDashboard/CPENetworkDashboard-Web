import { onMounted, onUnmounted, ref } from 'vue'

/** The site's current colour theme, kept in sync with `data-theme` on the root element. */
export function useSiteTheme() {
  const theme = ref<'light' | 'dark'>('light')
  let observer: MutationObserver | undefined
  const read = () => {
    theme.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  }
  onMounted(() => {
    read()
    observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
  })
  onUnmounted(() => observer?.disconnect())
  return theme
}
