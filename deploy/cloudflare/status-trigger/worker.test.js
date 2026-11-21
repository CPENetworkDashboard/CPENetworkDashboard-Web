import { describe, expect, it, vi } from 'vitest'
import worker, { dispatchStatusProbe } from './worker.js'

const env = {
  GITHUB_REPOSITORY: 'CPENetworkDashboard/CPENetworkDashboard-Web',
  GITHUB_DISPATCH_TOKEN: 'test-token',
}
const scheduledTime = Date.UTC(2026, 10, 21, 7, 2)

describe('Cloudflare status trigger', () => {
  it('sends a status-probe repository_dispatch to GitHub', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    await expect(dispatchStatusProbe(env, scheduledTime, fetchImpl)).resolves.toEqual({
      ok: true,
      attempt: 1,
    })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(
      'https://api.github.com/repos/CPENetworkDashboard/CPENetworkDashboard-Web/dispatches'
    )
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer test-token')
    expect(init.headers['User-Agent']).toBeTruthy()
    expect(JSON.parse(init.body)).toEqual({
      event_type: 'status-probe',
      client_payload: { trigger: 'cloudflare-cron', scheduledAt: '2026-11-21T07:02:00.000Z' },
    })
  })

  it('retries once on server errors and network failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(dispatchStatusProbe(env, scheduledTime, fetchImpl)).resolves.toEqual({
      ok: true,
      attempt: 2,
    })

    const failing = vi.fn(async () => new Response('busy', { status: 502 }))
    await expect(dispatchStatusProbe(env, scheduledTime, failing)).rejects.toThrow('HTTP 502')
    expect(failing).toHaveBeenCalledTimes(2)
  })

  it('does not retry authorization errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('Bad credentials', { status: 401 }))
    await expect(dispatchStatusProbe(env, scheduledTime, fetchImpl)).rejects.toThrow(
      'HTTP 401 Bad credentials'
    )
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('rejects missing configuration without calling GitHub', async () => {
    const fetchImpl = vi.fn()
    await expect(
      dispatchStatusProbe({ ...env, GITHUB_DISPATCH_TOKEN: '' }, scheduledTime, fetchImpl)
    ).rejects.toThrow('GITHUB_DISPATCH_TOKEN')
    await expect(
      dispatchStatusProbe({ ...env, GITHUB_REPOSITORY: 'bad' }, scheduledTime, fetchImpl)
    ).rejects.toThrow('GITHUB_REPOSITORY')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('keeps the scheduled handler alive until the dispatch settles', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))
    const pending = []
    await worker.scheduled({ scheduledTime }, env, { waitUntil: (p) => pending.push(p) })
    expect(pending).toHaveLength(1)
    await pending[0]
    expect(fetchSpy).toHaveBeenCalledOnce()
    fetchSpy.mockRestore()
  })
})
