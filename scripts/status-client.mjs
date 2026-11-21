import { checkService, serviceDefinitions } from '../src/utils/status.ts'

// Runtime-neutral collector core shared by the Node script and the Cloudflare Worker.
export const pause = (ms) => new Promise((done) => setTimeout(done, ms))
export function monitorOrigin(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname))
    throw new Error('Monitor origin must use HTTPS')
  if (url.username || url.password) throw new Error('Monitor origin must not contain credentials')
  return url.origin
}
export async function collectStatus(origin, fetcher = fetch) {
  const base = monitorOrigin(origin)
  const definitions = serviceDefinitions('/api').map((item) => ({
    ...item,
    path: new URL(item.path, base).href,
  }))
  const services = await Promise.all(definitions.map((item) => checkService(item, { fetcher })))
  return { at: new Date().toISOString(), services }
}
export function payload(report) {
  return {
    at: report.at,
    ...(report.monitor ? { monitor: report.monitor } : {}),
    services: report.services.map(({ id, state, httpStatus, version, build }) => ({
      id,
      state,
      httpStatus,
      ...(version ? { version } : {}),
      ...(build ? { build } : {}),
    })),
  }
}
export async function uploadStatusReports(origin, token, reports, options = {}) {
  const fetcher = options.fetcher || fetch
  const sleep = options.sleep || pause
  const base = monitorOrigin(origin)
  if (!token) throw new Error('Configure CPE_STATUS_TOKEN before uploading status measurements')
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let retryable = true
    try {
      const response = await fetcher(new URL('/api/status/ingest', base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ reports: reports.map(payload) }),
        signal: AbortSignal.timeout(30_000),
        redirect: 'manual',
      })
      if (!response.ok) {
        retryable = response.status === 408 || response.status === 429 || response.status >= 500
        await response.body?.cancel()
        throw new Error('Status ingest returned HTTP ' + response.status)
      }
      const result = await response.json()
      if (
        result.ok !== true ||
        !Number.isInteger(result.stored) ||
        !Number.isInteger(result.duplicates) ||
        result.stored < 0 ||
        result.duplicates < 0 ||
        result.stored + result.duplicates !== reports.length
      )
        throw new Error('Status ingest did not acknowledge every report; queue retained')
      return result
    } catch (error) {
      if (!retryable || attempt === 3) throw error
      await sleep(attempt * 2_000)
    }
  }
}
