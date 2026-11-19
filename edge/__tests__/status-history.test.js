import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const source = readFileSync(resolve('edge/index.js'), 'utf8')
const ids = ['website', 'health', 'releases', 'android', 'windows', 'macos']
let store, edge, rejectPut
function report(at, failed = false) {
  return {
    at,
    services: ids.map((id) => ({
      id,
      state: failed && id === 'android' ? 'unavailable' : 'operational',
      latencyMs: 100,
      httpStatus: failed && id === 'android' ? 503 : 200,
      version: ['android', 'windows', 'macos'].includes(id) ? '3.7.1' : undefined,
    })),
  }
}
function loadEdge() {
  return new Function('EdgeKV', source.replace('export default', 'return'))(
    class {
      async get(key) {
        return store.get(key)
      }
      async put(key, value) {
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Unsupported KV key')
        if (key === rejectPut) {
          rejectPut = null
          throw new Error('Injected storage failure')
        }
        store.set(key, value)
      }
    }
  )
}
async function ingest(data, token = 'monitor-test-token') {
  return edge.fetch(
    new Request('https://cpe.yuan6.cn/api/status/ingest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  )
}
async function summary(days = 30) {
  const response = await edge.fetch(
    new Request('https://cpe.yuan6.cn/api/status/summary?days=' + days)
  )
  expect(response.status).toBe(200)
  return response.json()
}

describe('durable status history', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-19T10:12:00Z'))
    delete globalThis.__CPE_PLUS_PLUS_EDGE_RUNTIME__
    store = new Map([['config', JSON.stringify({ CPE_STATUS_TOKEN: 'monitor-test-token' })]])
    rejectPut = null
    edge = loadEdge()
  })
  afterEach(() => {
    vi.useRealTimers()
    delete globalThis.__CPE_PLUS_PLUS_EDGE_RUNTIME__
  })
  it('rejects unauthenticated writes and invalid reports', async () => {
    expect((await ingest(report('2026-11-19T10:00:00Z'), 'wrong')).status).toBe(403)
    expect((await ingest({ at: '2026-11-19T10:00:00Z', services: [] })).status).toBe(400)
    expect([...store.keys()].filter((key) => key.startsWith('status_'))).toHaveLength(0)
  })
  it('persists across a fresh runtime and deduplicates retried slots', async () => {
    const observation = report('2026-11-19T10:00:00Z')
    expect((await ingest(observation)).status).toBe(200)
    expect((await (await ingest(observation)).json()).duplicate).toBe(true)
    delete globalThis.__CPE_PLUS_PLUS_EDGE_RUNTIME__
    edge = loadEdge()
    const result = await summary()
    expect(result.source).toBe('scheduled-monitor')
    expect(result.history).toHaveLength(1)
    expect(result.totals.samples).toBe(1)
    expect(result.latest.at).toBe(new Date(observation.at).toISOString())
    expect(result.latest.services.find((service) => service.id === 'android').version).toBe('3.7.1')
  })
  it('retains failures, excludes missing periods from availability and reports coverage', async () => {
    await ingest(report('2026-11-19T10:00:00Z'))
    await ingest(report('2026-11-19T10:10:00Z', true))
    const result = await summary(90)
    expect(result.daily).toHaveLength(90)
    expect(result.services.android.availability).toBe(50)
    expect(result.totals.availability).toBe(50)
    expect(result.daily.at(-1).expected).toBe(3)
    expect(result.daily.at(-1).samples).toBe(2)
    expect(result.totals.coverage).toBe(66.67)
    expect(result.daily[0].coverage).toBeNull()
  })
  it('uses Shanghai calendar dates across UTC midnight boundaries', async () => {
    await ingest(report('2026-11-18T18:00:00Z'))
    const result = await summary()
    expect(result.daily.at(-1).samples).toBe(1)
    expect(store.has('status_v1_day__2026-11-19')).toBe(true)
    expect(result.stale).toBe(true)
  })
  it('repairs interrupted writes from canonical samples on retry', async () => {
    rejectPut = 'status_v1_day__2026-11-19'
    const observation = report('2026-11-19T10:00:00Z')
    expect((await ingest(observation)).status).toBe(503)
    expect((await ingest(observation)).status).toBe(200)
    expect((await summary()).totals.samples).toBe(1)
  })
  it('does not treat a storage outage as empty healthy history', async () => {
    edge = new Function('EdgeKV', source.replace('export default', 'return'))(
      class {
        async get() {
          throw new Error('KV offline')
        }
      }
    )
    const response = await edge.fetch(new Request('https://cpe.yuan6.cn/api/status/summary'))
    expect(response.status).toBe(503)
  })
})
