// Cron-only Worker: asks GitHub to run the existing status collector workflow.
const GITHUB_API = 'https://api.github.com'
const EVENT_TYPE = 'status-probe'
const MAX_ATTEMPTS = 2

export async function dispatchStatusProbe(env, scheduledTime, fetchImpl = fetch) {
  const repository = env.GITHUB_REPOSITORY
  const token = env.GITHUB_DISPATCH_TOKEN
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) {
    throw new Error('GITHUB_REPOSITORY must be set to owner/repo')
  }
  if (!token) throw new Error('GITHUB_DISPATCH_TOKEN secret is not set')

  const request = {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'cpe-status-trigger',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      event_type: EVENT_TYPE,
      client_payload: {
        trigger: 'cloudflare-cron',
        scheduledAt: new Date(scheduledTime).toISOString(),
      },
    }),
  }

  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchImpl(`${GITHUB_API}/repos/${repository}/dispatches`, request)
      if (response.status === 204) return { ok: true, attempt }
      const detail = (await response.text()).slice(0, 300)
      lastError = new Error(`GitHub dispatch failed: HTTP ${response.status} ${detail}`)
      if (response.status < 500 && response.status !== 429) break
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      dispatchStatusProbe(env, controller.scheduledTime).then((result) => {
        console.log(`status-probe dispatched (attempt ${result.attempt})`)
      })
    )
  },
}
