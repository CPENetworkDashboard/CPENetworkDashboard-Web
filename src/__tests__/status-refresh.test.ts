import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { useServiceStatus } from '@/composables/useServiceStatus'

let status: ReturnType<typeof useServiceStatus>
let wrapper: VueWrapper
const fetcher = vi.fn<typeof fetch>()
const snapshot = (days = 30) =>
  new Response(
    JSON.stringify({
      ok: true,
      source: 'scheduled-monitor',
      windowDays: days,
      latest: null,
      history: [],
      daily: [],
      services: {},
      totals: { samples: 0 },
    })
  )

beforeEach(() => {
  vi.useFakeTimers()
  fetcher.mockReset()
  vi.stubGlobal('fetch', fetcher)
})
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function setup() {
  wrapper = mount(
    defineComponent({
      setup() {
        status = useServiceStatus()
        return () => null
      },
    })
  )
  await flushPromises()
}

describe('status refresh reliability', () => {
  it('treats an expired successful sample as unknown current state', async () => {
    const ids = ['website', 'health', 'releases', 'android', 'windows', 'macos']
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          source: 'scheduled-monitor',
          windowDays: 30,
          daily: [],
          history: [],
          services: {},
          totals: { samples: 1 },
          stale: true,
          latest: {
            at: new Date(Date.now() - 20 * 60000).toISOString(),
            services: ids.map((id) => ({ id, state: 'operational', httpStatus: 200 })),
          },
        })
      )
    )
    await setup()
    expect(status.stale.value).toBe(true)
    expect(status.state.value).toBe('unknown')
    expect(status.available.value).toBe(6)
  })
  it('rejects duplicate or incomplete service IDs instead of showing a false healthy state', async () => {
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          source: 'scheduled-monitor',
          windowDays: 30,
          daily: [],
          history: [],
          services: {},
          totals: { samples: 1 },
          latest: {
            at: new Date().toISOString(),
            services: Array.from({ length: 6 }, () => ({ id: 'website', state: 'operational' })),
          },
        })
      )
    )
    await setup()
    expect(status.state.value).toBe('unknown')
    expect(status.error.value).toContain('数据格式')
  })
  it('waits a minute before retrying a failed refresh', async () => {
    fetcher.mockRejectedValue(new Error('offline'))
    await setup()
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(59_000)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000)
    await flushPromises()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('keeps the successful period selected when another period cannot be loaded', async () => {
    fetcher.mockResolvedValueOnce(snapshot(30)).mockRejectedValueOnce(new Error('offline'))
    await setup()
    await status.setDays(90)
    expect(status.days.value).toBe(30)
    expect(status.summary.value?.windowDays).toBe(30)
  })
})
