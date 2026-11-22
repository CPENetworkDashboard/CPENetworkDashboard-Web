import { computed, useTemplateRef, watch } from 'vue'
import { useStoryProgress } from '@/composables/useStoryProgress'
import { span } from './quality'

/** Shared wiring for a story chapter: autoplaying progress, title reveal and rail reporting. */
export function useChapter(duration: number, report: (value: number, scroll: number) => void) {
  const chapter = useTemplateRef<{ $el: HTMLElement }>('chapter')
  const el = computed(() => chapter.value?.$el ?? null)
  const { progress, scroll } = useStoryProgress(el, duration)
  watch([progress, scroll], ([value, position]) => report(value, position))
  const reveal = computed(() => span(progress.value, 0, 0.3))
  return { t: progress, reveal }
}
