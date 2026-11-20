import { describe, expect, it, vi } from 'vitest'
import { checkService, observationState, serviceDefinitions } from '@/utils/status'

const definitions = serviceDefinitions('/api')
const android = definitions.find((item) => item.id === 'android')!
const valid = {
  ok: true,
  platform: 'android',
  channel: 'stable',
  updateAvailable: true,
  latest: {
    platform: 'android',
    channel: 'stable',
    version: '3.7.1',
    download: { mode: 'chunked' },
  },
}
function fetchResponse(value: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(value), { status }))
}

describe('service status probes', () => {
  it('checks all three platforms with the real POST contract', async () => {
    expect(definitions.filter((item) => item.platform).map((item) => item.platform)).toEqual([
      'android',
      'windows',
      'macos',
    ])
    const fetcher = fetchResponse(valid)
    expect(await checkService(android, { fetcher })).toMatchObject({
      state: 'operational',
      version: '3.7.1',
      httpStatus: 200,
    })
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual({
      platform: 'android',
      version: '0.0.0',
      versionCode: 0,
      channel: 'stable',
    })
  })
  it('does not label HTTP failures or HTML fallback as operational', async () => {
    expect((await checkService(android, { fetcher: fetchResponse({}, 503) })).state).toBe(
      'unavailable'
    )
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>Not an API</html>'))
    expect((await checkService(android, { fetcher })).state).toBe('unavailable')
  })
  it('rejects successful-looking responses from the wrong platform or missing releases', async () => {
    for (const value of [
      { ...valid, platform: 'windows' },
      { ...valid, latest: null },
      { ...valid, updateAvailable: undefined },
    ]) {
      expect((await checkService(android, { fetcher: fetchResponse(value) })).state).toBe(
        'unavailable'
      )
    }
  })
  it('keeps the timeout active until response body consumption finishes', async () => {
    vi.useFakeTimers()
    try {
      const fetcher = vi.fn<typeof fetch>().mockImplementation(
        async (_url, init) =>
          ({
            ok: true,
            status: 200,
            json: () =>
              new Promise((_resolve, reject) =>
                init?.signal?.addEventListener('abort', () =>
                  reject(new DOMException('Timed out', 'AbortError'))
                )
              ),
          }) as Response
      )
      const pending = checkService(android, { fetcher })
      await vi.advanceTimersByTimeAsync(20_001)
      expect(await pending).toMatchObject({
        state: 'unavailable',
        detail: '服务连接超时',
      })
    } finally {
      vi.useRealTimers()
    }
  })
  it('makes a partial outage visible rather than averaging it away', async () => {
    const healthy = await checkService(android, { fetcher: fetchResponse(valid) })
    const failed = await checkService(android, { fetcher: fetchResponse({}, 500) })
    expect(observationState([])).toBe('unknown')
    expect(observationState([healthy, failed])).toBe('partial')
    expect(observationState([failed])).toBe('unavailable')
  })
})
