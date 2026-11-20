export type ServiceState = 'operational' | 'unavailable'
export interface ServiceDefinition {
  id: string
  name: string
  description: string
  path: string
  method: 'GET' | 'POST'
  platform?: 'android' | 'windows' | 'macos'
}
export interface ServiceResult {
  id: string
  state: ServiceState
  httpStatus: number | null
  checkedAt: string
  detail: string
  version?: string
  build?: string
}
export interface StatusObservation {
  at: string
  services: ServiceResult[]
}
export interface StatusMetric {
  checks: number
  available: number
  failed: number
  availability: number | null
}
export interface StatusDay {
  date: string
  samples: number
  expected: number
  coverage: number | null
  services: Record<string, StatusMetric>
}
export interface StoredStatusSummary {
  ok: true
  source: 'scheduled-monitor'
  schemaVersion: number
  intervalSeconds: number
  timeZone: string
  windowDays: number
  firstCheckedAt: string | null
  lastCheckedAt: string | null
  stale: boolean
  monitor?: {
    lastReceivedAt: string | null
    ageSeconds: number | null
    nextExpectedAt: string | null
    missedSlots: number
    source: 'github-actions' | 'external' | 'legacy'
    event: string
    runUrl: string | null
    samples24h: number
  }
  latest: StatusObservation | null
  history: StatusObservation[]
  daily: StatusDay[]
  services: Record<string, StatusMetric>
  totals: {
    checks: number
    samples: number
    expected: number
    coverage: number | null
    availability: number | null
  }
  generatedAt: string
}

export function serviceDefinitions(base: string): ServiceDefinition[] {
  return [
    {
      id: 'website',
      name: '官网',
      description: '验证首页 HTML 可正常读取',
      path: '/',
      method: 'GET',
    },
    {
      id: 'health',
      name: '边缘服务',
      description: '验证健康接口与部署构建',
      path: base + '/health',
      method: 'GET',
    },
    {
      id: 'releases',
      name: '版本列表',
      description: '验证三平台稳定版发布数据',
      path: base + '/updates/latest',
      method: 'GET',
    },
    ...(['android', 'windows', 'macos'] as const).map((platform) => ({
      id: platform,
      name: { android: 'Android 更新', windows: 'Windows 更新', macos: 'macOS 更新' }[platform],
      description: '验证应用实际使用的稳定版检查请求',
      path: base + '/updates/check',
      method: 'POST' as const,
      platform,
    })),
  ]
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('接口返回的数据格式不正确')
  return value as Record<string, unknown>
}
function release(value: unknown, platform: string): Record<string, unknown> {
  const data = record(value)
  if (
    data.platform !== platform ||
    data.channel !== 'stable' ||
    typeof data.version !== 'string' ||
    !/^\d+\.\d+/.test(data.version)
  ) {
    throw new Error('未取得有效的 ' + platform + ' 稳定版信息')
  }
  const download = record(data.download)
  if (!['single', 'chunked'].includes(String(download.mode)))
    throw new Error('版本信息缺少有效的下载方式')
  return data
}

export async function checkService(
  definition: ServiceDefinition,
  options: { signal?: AbortSignal; fetcher?: typeof fetch; timeoutMs?: number } = {}
): Promise<ServiceResult> {
  const fetcher = options.fetcher || fetch
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, options.timeoutMs ?? 20_000)
  let httpStatus: number | null = null
  try {
    const response = await fetcher(definition.path, {
      method: definition.method,
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
      headers:
        definition.method === 'POST'
          ? { Accept: 'application/json', 'Content-Type': 'application/json' }
          : { Accept: definition.id === 'website' ? 'text/html' : 'application/json' },
      ...(definition.platform
        ? {
            body: JSON.stringify({
              platform: definition.platform,
              version: '0.0.0',
              versionCode: 0,
              channel: 'stable',
            }),
          }
        : {}),
    })
    httpStatus = response.status
    if (!response.ok) throw new Error('服务返回 HTTP ' + response.status)
    let detail = '请求成功'
    let version: string | undefined
    let build: string | undefined
    if (definition.id === 'website') {
      const html = await response.text()
      if (!html.includes('id="app"') || !html.includes('<script'))
        throw new Error('页面未返回预期的官网内容')
      detail = '官网 HTML 读取成功'
    } else {
      const data = record(await response.json())
      if (data.ok !== true) throw new Error('接口未返回成功状态')
      if (typeof data.build === 'string') build = data.build
      if (definition.platform) {
        if (
          data.platform !== definition.platform ||
          data.channel !== 'stable' ||
          typeof data.updateAvailable !== 'boolean'
        )
          throw new Error('更新检查响应与请求不匹配')
        const latest = release(data.latest, definition.platform)
        version = String(latest.version)
        detail = '稳定版 ' + version + ' · 更新检查正常'
      } else if (definition.id === 'releases') {
        const releases = record(data.releases)
        for (const platform of ['android', 'windows', 'macos'])
          release(record(releases[platform]).stable, platform)
        detail = 'Android、Windows、macOS 发布数据有效'
      } else {
        if (data.service !== 'cpe-plus-plus-web') throw new Error('健康接口未返回预期的服务标识')
        detail = '健康检查通过'
      }
    }
    return {
      id: definition.id,
      state: 'operational',
      httpStatus,
      checkedAt: new Date().toISOString(),
      detail,
      version,
      build,
    }
  } catch (error) {
    if (options.signal?.aborted) throw error
    return {
      id: definition.id,
      state: 'unavailable',
      httpStatus,
      checkedAt: new Date().toISOString(),
      detail: controller.signal.aborted
        ? '服务连接超时'
        : error instanceof SyntaxError
          ? '接口返回了无效的 JSON'
          : error instanceof Error && error.message !== 'Failed to fetch'
            ? error.message
            : '当前网络无法连接该服务',
    }
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}

export function observationState(
  results: ServiceResult[]
): 'operational' | 'partial' | 'unavailable' | 'unknown' {
  if (!results.length) return 'unknown'
  const available = results.filter((result) => result.state !== 'unavailable')
  if (!available.length) return 'unavailable'
  if (available.length !== results.length) return 'partial'
  return 'operational'
}
