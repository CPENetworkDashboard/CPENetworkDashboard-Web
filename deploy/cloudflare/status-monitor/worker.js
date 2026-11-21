// Cron-only Worker: checks the services and writes results to the existing ingest API.
import {
  collectStatus,
  monitorOrigin,
  uploadStatusReports,
} from '../../../scripts/status-client.mjs'

const PENDING_KEY = 'pending'
const EXPIRED_KEY = 'expired-recovery'
const REPLAY_WINDOW_MS = 7 * 86400_000
// Ingest rewrites the whole history per request, so replay in one request per run.
const MAX_BATCH = 2016

async function readList(kv, key) {
  const value = (await kv.get(key, 'json')) ?? []
  if (!Array.isArray(value)) throw new Error(`Workers KV key "${key}" is not a report list`)
  return value
}

export async function runStatusMonitor(env, options = {}) {
  const origin = monitorOrigin(env.CPE_STATUS_ORIGIN || 'https://cpe.yuan6.cn')
  const token = env.CPE_STATUS_TOKEN
  const kv = env.STATUS_QUEUE
  if (!token) throw new Error('CPE_STATUS_TOKEN secret is not set')
  if (!kv) throw new Error('STATUS_QUEUE Workers KV binding is not set')

  const report = await collectStatus(origin, options.fetcher)
  report.monitor = { source: 'external', event: 'schedule' }

  const pending = await readList(kv, PENDING_KEY)
  const cutoff = Date.now() - REPLAY_WINDOW_MS
  const expired = pending.filter((entry) => !(Date.parse(entry.at) >= cutoff))
  let queue = [...pending.filter((entry) => Date.parse(entry.at) >= cutoff), report]
  if (expired.length) {
    const recovery = await readList(kv, EXPIRED_KEY)
    await kv.put(EXPIRED_KEY, JSON.stringify([...recovery, ...expired]))
  }

  const batch = queue.slice(0, MAX_BATCH)
  const remaining = queue.slice(batch.length)
  let result
  try {
    result = await uploadStatusReports(origin, token, batch, options)
  } catch (error) {
    // Keep unacknowledged reports, including real outage results, for the next run.
    await kv.put(PENDING_KEY, JSON.stringify(queue))
    throw error
  }
  if (remaining.length) await kv.put(PENDING_KEY, JSON.stringify(remaining))
  else if (pending.length) await kv.delete(PENDING_KEY)
  return {
    checkedAt: report.at,
    stored: result.stored,
    duplicates: result.duplicates,
    remaining: remaining.length,
    replayed: pending.length - expired.length,
    expired: expired.length,
    services: report.services.map(({ id, state }) => ({ id, state })),
  }
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runStatusMonitor(env).then((result) => console.log(JSON.stringify(result))))
  },
}
