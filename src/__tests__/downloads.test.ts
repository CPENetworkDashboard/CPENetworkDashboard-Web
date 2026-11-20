import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDownloads } from '@/composables/useDownloads'
import type { Download } from '@/types'

vi.mock('@/api', () => ({ trackDownload: vi.fn(() => new Promise(() => {})) }))
vi.mock('@/composables/useAnalytics', () => ({
  useAnalytics: () => ({ applyDownloadTrack: vi.fn(), loadSummary: vi.fn() }),
}))

const requests: ChunkRequest[] = []
const save = vi.fn(() => 'blob:verified-test')
class ChunkRequest {
  status = 200
  response: Blob | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onprogress = null
  ontimeout = null
  responseType = ''
  timeout = 0
  open = vi.fn()
  send = vi.fn()
  constructor() {
    requests.push(this)
  }
  complete(value: string) {
    this.response = new Blob([value])
    this.onload?.()
  }
}
const item = (id: string): Download => ({
  id,
  platform: 'Android',
  version: 'test',
  title: 'test',
  fileName: 'test.apk',
  chunks: ['/first', '/second'],
  chunkBytes: [3, 3],
  size: '6 B',
  checksum: '',
  label: '',
  copy: '',
})
beforeEach(() => {
  vi.useFakeTimers()
  requests.length = 0
  save.mockClear()
  vi.stubGlobal('XMLHttpRequest', ChunkRequest)
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = save
      static revokeObjectURL = vi.fn()
    }
  )
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('split package downloads', () => {
  it('starts immediately even when analytics does not respond, and ignores double clicks', async () => {
    const api = useDownloads()
    const download = item('pending-analytics')
    const pending = api.downloadChunkedFile(download)
    expect(requests).toHaveLength(1)
    await api.downloadChunkedFile(download)
    expect(requests).toHaveLength(1)
    requests[0]!.complete('bad size')
    await pending
  })
  it('rejects a truncated or HTML fallback part instead of saving a corrupt installer', async () => {
    const api = useDownloads()
    const download = item('truncated-part')
    const pending = api.downloadChunkedFile(download)
    requests[0]!.complete('<html>not a binary</html>')
    await pending
    expect(api.getDownloadState(download.id).status).toBe('error')
    expect(save).not.toHaveBeenCalled()
  })
  it('combines only complete parts into the expected installer size', async () => {
    const api = useDownloads()
    const download = item('complete-parts')
    const pending = api.downloadChunkedFile(download)
    requests[0]!.complete('abc')
    await Promise.resolve()
    expect(requests).toHaveLength(2)
    requests[1]!.complete('def')
    await pending
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ size: 6 }))
    expect(api.getDownloadState(download.id).status).toBe('done')
  })
})
