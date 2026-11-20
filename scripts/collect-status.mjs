import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkService, serviceDefinitions } from '../src/utils/status.ts'

export async function collectStatus(origin, fetcher = fetch) {
  const url = new URL(origin)
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname))
    throw new Error('Monitor origin must use HTTPS')
  const definitions = serviceDefinitions('/api').map((definition) => ({
    ...definition,
    path: new URL(definition.path, url.origin).href,
  }))
  const services = await Promise.all(
    definitions.map((definition) => checkService(definition, { fetcher }))
  )
  return { at: new Date().toISOString(), services }
}

export async function persistQueue(path, reports) {
  await mkdir(resolve(path, '..'), { recursive: true })
  await writeFile(path + '.tmp', JSON.stringify(reports), { mode: 0o600 })
  await rename(path + '.tmp', path)
}

async function main() {
  const origin = process.env.CPE_STATUS_ORIGIN || 'https://cpe.yuan6.cn'
  const dryRun = process.argv.includes('--dry-run')
  const report = await collectStatus(origin)
  if (dryRun) {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  const token = process.env.CPE_STATUS_TOKEN
  if (!token) throw new Error('Configure CPE_STATUS_TOKEN before uploading status measurements')
  const path = resolve('.status-reports/pending.json')
  let pending = []
  try {
    pending = JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (!Array.isArray(pending)) throw new Error('Pending report queue is invalid')
  // Persist before upload so an unavailable ingest endpoint does not erase outage evidence.
  pending.push(report)
  await persistQueue(path, pending)
  const cutoff = Date.now() - 7 * 86400_000
  const expired = pending.filter((entry) => Date.parse(entry.at) < cutoff)
  const deliverable = pending.filter((entry) => Date.parse(entry.at) >= cutoff)
  let storedCount = 0
  let duplicateCount = 0
  if (deliverable.length) {
    try {
      const response = await fetch(new URL('/api/status/ingest', origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          reports: deliverable.map((entry) => ({
            at: entry.at,
            services: entry.services.map(({ id, state, httpStatus, version, build }) => ({
              id,
              state,
              httpStatus,
              ...(version ? { version } : {}),
              ...(build ? { build } : {}),
            })),
          })),
        }),
        signal: AbortSignal.timeout(30_000),
        redirect: 'error',
      })
      if (!response.ok) throw new Error('Status ingest returned HTTP ' + response.status)
      const result = await response.json()
      if (result.ok !== true) throw new Error('Status ingest did not acknowledge the reports')
      storedCount = Number(result.stored) || 0
      duplicateCount = Number(result.duplicates) || 0
    } catch (error) {
      await persistQueue(path, pending)
      // Do not print request headers, tokens, or raw upstream response bodies.
      throw new Error(
        'Upload incomplete; ' + pending.length + ' reports retained. ' + error.message,
        { cause: error }
      )
    }
  }
  await persistQueue(path, expired)
  if (expired.length) {
    console.error(
      expired.length +
        ' reports are older than the 7-day replay window; retained locally for manual recovery.'
    )
    process.exitCode = 1
  }
  console.log(
    'Stored ' +
      storedCount +
      ' report(s); ignored ' +
      duplicateCount +
      ' duplicate(s) in the existing KV namespace.'
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
