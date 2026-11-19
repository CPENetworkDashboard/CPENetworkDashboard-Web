import type { Plugin } from 'vite'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

// Development-only EdgeKV adapter. Files survive Vite restarts; production uses ESA EdgeKV.
export function devStatusPlugin(): Plugin {
  return {
    name: 'cpe-local-status-kv',
    apply: 'serve',
    async configureServer(server) {
      const directory = resolve(server.config.root, '.status-data')
      await mkdir(directory, { recursive: true })
      const tokenPath = resolve(directory, 'monitor-token')
      let token: string
      try {
        token = await readFile(tokenPath, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        token = randomBytes(32).toString('hex')
        await writeFile(tokenPath, token, { mode: 0o600 })
      }
      class LocalEdgeKV {
        async get(key: string) {
          if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid KV key')
          if (key === 'config') return JSON.stringify({ CPE_STATUS_TOKEN: token })
          try {
            return await readFile(resolve(directory, key + '.json'), 'utf8')
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
            throw error
          }
        }
        async put(key: string, value: string) {
          if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid KV key')
          const path = resolve(directory, key + '.json')
          await writeFile(path + '.tmp', value)
          await rename(path + '.tmp', path)
        }
      }
      const source = await readFile(resolve(server.config.root, 'edge/index.js'), 'utf8')
      const edge = new Function('EdgeKV', source.replace('export default', 'return'))(
        LocalEdgeKV
      ) as { fetch: (request: Request) => Promise<Response> }
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith('/api/status/')) {
          next()
          return
        }
        try {
          const chunks: Buffer[] = []
          let bytes = 0
          for await (const chunk of request) {
            bytes += Buffer.byteLength(chunk)
            if (bytes > 24 * 1024) {
              response.statusCode = 413
              response.end()
              return
            }
            chunks.push(Buffer.from(chunk))
          }
          const headers = new Headers()
          for (const [name, value] of Object.entries(request.headers))
            if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value)
          const result = await edge.fetch(
            new Request('http://127.0.0.1' + request.url, {
              method: request.method,
              headers,
              ...(!['GET', 'HEAD'].includes(request.method || 'GET')
                ? { body: Buffer.concat(chunks).toString() }
                : {}),
            })
          )
          response.statusCode = result.status
          result.headers.forEach((value, name) => response.setHeader(name, value))
          response.end(Buffer.from(await result.arrayBuffer()))
        } catch {
          response.statusCode = 503
          response.end(JSON.stringify({ ok: false, error: 'Local status storage unavailable' }))
        }
      })
    },
  }
}
