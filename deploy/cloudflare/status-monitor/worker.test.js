// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import worker, { runStatusMonitor } from './worker.js'

const reply = (body, status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
const noWait = async () => {}

function memoryKv(initial = {}) {
  const data = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]))
  return {
    data,
    get: vi.fn(async (key) => (data.has(key) ? JSON.parse(data.get(key)) : null)),
    put: vi.fn(async (key, value) => void data.set(key, value)),
    delete: vi.fn(async (key) => void data.delete(key)),
  }
}

function services(fail = false) {
  const release = (platform) => ({
    platform,
    channel: 'stable',
    version: '3.5.3',
    download: { mode: 'single' },
  })
  return async (url, init = {}) => {
    if (fail) throw new TypeError('network down')
    const path = new URL(url).pathname
    if (path === '/') return reply('<div id="app"></div><script></script>')
    if (path === '/api/health') return reply({ ok: true, service: 'cpe-plus-plus-web' })
    if (path === '/api/updates/latest')
      return reply({
        ok: true,
        releases: Object.fromEntries(
          ['android', 'windows', 'macos'].map((p) => [p, { stable: release(p) }])
        ),
      })
    const { platform } = JSON.parse(init.body)
    return reply({
      ok: true,
      platform,
      channel: 'stable',
      updateAvailable: true,
      latest: release(platform),
    })
  }
}

function harness({ servicesDown = false, ingest = () => ({ ok: true }) } = {}) {
  const uploads = []
  const check = services(servicesDown)
  const fetcher = vi.fn(async (url, init) => {
    if (new URL(url).pathname === '/api/status/ingest') {
      const body = JSON.parse(init.body)
      uploads.push({ body, init })
      const result = ingest(body)
      return result instanceof Response
        ? result
        : reply({ ...result, stored: body.reports.length, duplicates: 0 })
    }
    return check(url, init)
  })
  return { fetcher, uploads }
}

const env = (kv) => ({ CPE_STATUS_TOKEN: 'status-token', STATUS_QUEUE: kv })

describe('Cloudflare status monitor', () => {
  it('checks all services and uploads one external scheduled report', async () => {
    const kv = memoryKv()
    const { fetcher, uploads } = harness()
    const result = await runStatusMonitor(env(kv), { fetcher, sleep: noWait })
    expect(result.stored).toBe(1)
    expect(result.services.map((s) => s.state)).toEqual(Array(6).fill('operational'))
    expect(uploads).toHaveLength(1)
    expect(uploads[0].init.headers.Authorization).toBe('Bearer status-token')
    expect(uploads[0].init.redirect).toBe('manual')
    expect(uploads[0].body.reports[0].monitor).toEqual({ source: 'external', event: 'schedule' })
    expect(kv.put).not.toHaveBeenCalled()
  })

  it('queues real outage results when ingest is unreachable and replays them later', async () => {
    const kv = memoryKv()
    const down = harness({ servicesDown: true, ingest: () => reply('down', 503) })
    await expect(
      runStatusMonitor(env(kv), { fetcher: down.fetcher, sleep: noWait })
    ).rejects.toThrow('HTTP 503')
    const queued = JSON.parse(kv.data.get('pending'))
    expect(queued).toHaveLength(1)
    expect(queued[0].services.every((s) => s.state === 'unavailable')).toBe(true)

    const up = harness()
    const result = await runStatusMonitor(env(kv), { fetcher: up.fetcher, sleep: noWait })
    expect(result).toMatchObject({ stored: 2, replayed: 1, expired: 0 })
    expect(up.uploads[0].body.reports).toHaveLength(2)
    expect(kv.data.has('pending')).toBe(false)
  })

  it('moves reports older than seven days to recovery instead of blocking new uploads', async () => {
    const old = { at: new Date(Date.now() - 8 * 86400_000).toISOString(), services: [] }
    const kv = memoryKv({ pending: [old] })
    const { fetcher, uploads } = harness()
    const result = await runStatusMonitor(env(kv), { fetcher, sleep: noWait })
    expect(result).toMatchObject({ stored: 1, expired: 1, replayed: 0 })
    expect(uploads[0].body.reports).toHaveLength(1)
    expect(JSON.parse(kv.data.get('expired-recovery'))).toEqual([old])
  })

  it('replays at most one ingest request per run and keeps the rest queued', async () => {
    const at = new Date().toISOString()
    const pending = Array.from({ length: 2016 }, () => ({ at, services: [] }))
    const kv = memoryKv({ pending })
    const up = harness()
    const result = await runStatusMonitor(env(kv), { fetcher: up.fetcher, sleep: noWait })
    expect(up.uploads).toHaveLength(1)
    expect(up.uploads[0].body.reports).toHaveLength(2016)
    expect(result.remaining).toBe(1)
    expect(JSON.parse(kv.data.get('pending'))).toHaveLength(1)
  })

  it('does not retry or queue when the token is rejected', async () => {
    const kv = memoryKv()
    const { fetcher, uploads } = harness({ ingest: () => reply({ ok: false }, 403) })
    await expect(runStatusMonitor(env(kv), { fetcher, sleep: noWait })).rejects.toThrow('HTTP 403')
    expect(uploads).toHaveLength(1)
    expect(JSON.parse(kv.data.get('pending'))).toHaveLength(1)
  })

  it('requires the token and KV binding before checking anything', async () => {
    const fetcher = vi.fn()
    await expect(runStatusMonitor({ STATUS_QUEUE: memoryKv() }, { fetcher })).rejects.toThrow(
      'CPE_STATUS_TOKEN'
    )
    await expect(runStatusMonitor({ CPE_STATUS_TOKEN: 'x' }, { fetcher })).rejects.toThrow(
      'STATUS_QUEUE'
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('keeps the scheduled handler alive until the run settles', async () => {
    const pending = []
    await worker.scheduled({}, {}, { waitUntil: (p) => pending.push(p) })
    expect(pending).toHaveLength(1)
    await expect(pending[0]).rejects.toThrow('CPE_STATUS_TOKEN')
  })
})
