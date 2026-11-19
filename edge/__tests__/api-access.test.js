import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve('edge/index.js'), 'utf8')
const origin = 'https://cpe.yuan6.cn'

function createEdge(config = {}) {
  const serialized = JSON.stringify(config)
  return new Function('EdgeKV', source.replace('export default', 'return'))(
    class {
      async get(key) {
        return key === 'config' ? serialized : undefined
      }
      async put() {
        throw new Error('This request must not modify storage')
      }
    }
  )
}

describe('public API boundaries', () => {
  it('keeps client-required health, release and version-check reads public', async () => {
    const edge = createEdge()
    for (const path of [
      '/api/health',
      '/api/updates/latest',
      '/api/updates/check?platform=android&version=0.0.0&channel=stable',
    ]) {
      const response = await edge.fetch(new Request(origin + path))
      expect(response.status, path).toBe(200)
    }
    const health = await (await edge.fetch(new Request(origin + '/api/health'))).json()
    expect(health).not.toHaveProperty('namespace')
  })

  it('requires a read token for detailed analytics', async () => {
    const edge = createEdge({ CPE_ANALYTICS_TOKEN: 'read-secret' })
    const denied = await edge.fetch(new Request(origin + '/api/analytics/summary'))
    expect(denied.status).toBe(403)
    const allowed = await edge.fetch(
      new Request(origin + '/api/analytics/summary', {
        headers: { Authorization: 'Bearer read-secret' },
      })
    )
    expect(allowed.status).toBe(200)
  })

  it('fails closed when an administrative write token is missing or incorrect', async () => {
    const noToken = createEdge()
    const missingConfig = await noToken.fetch(
      new Request(origin + '/api/updates/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'android', version: '9.9.9' }),
      })
    )
    expect(missingConfig.status).toBe(403)

    const protectedEdge = createEdge({ CPE_STATS_TOKEN: 'write-secret' })
    const wrongToken = await protectedEdge.fetch(
      new Request(origin + '/api/updates/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' },
        body: JSON.stringify({ platform: 'android', version: '9.9.9' }),
      })
    )
    expect(wrongToken.status).toBe(403)
  })

  it('does not reuse the general stats-write token for status-ingest authentication', async () => {
    const edge = createEdge({ CPE_STATS_TOKEN: 'write-secret' })
    const response = await edge.fetch(
      new Request(origin + '/api/status/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer write-secret' },
        body: JSON.stringify({}),
      })
    )
    expect(response.status).toBe(403)
  })
})
