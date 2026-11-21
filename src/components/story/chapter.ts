import { computed, useTemplateRef, watch } from 'vue'
import { useStoryProgress } from '@/composables/useStoryProgress'
import { ease, span } from './quality'

/** Shared wiring for a story chapter: autoplaying progress, title reveal and rail reporting. */
export function useChapter(duration: number, report: (value: number) => void) {
  const chapter = useTemplateRef<{ $el: HTMLElement }>('chapter')
  const el = computed(() => chapter.value?.$el ?? null)
  const { progress } = useStoryProgress(el, duration)
  watch(progress, report)
  const reveal = computed(() => ease(span(progress.value, 0, 0.08)))
  return { t: progress, reveal }
}
