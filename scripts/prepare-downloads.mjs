import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

// This commit in the original public repository contains the published packages.
const revision = '9ca8af38b5ab6878d036da01e60c1c185be4253a'
const origin = 'https://raw.githubusercontent.com/yuan-666/CPENetworkDashboard-Web/' + revision
const cache = join('release', 'esa-downloads', revision)
const chunkBytes = 20 * 1024 * 1024
const packages = [
  ['CPENetworkDashboard V3.7.1.apk', 31_813_361, 'android-3.7.1'],
  ['CPENetworkDashboard V3.6.5.apk', 16_836_991],
  ['CPEPlusPlus-3.5.3-macos-arm64.dmg', 134_563_421, 'macos-3.5.3'],
  ['CPEPlusPlus-3.5.3-windows-x64.exe', 146_566_384, 'windows-exe-3.5.3'],
  ['CPEPlusPlus-3.5.3-windows-x64.msi', 145_825_792, 'windows-msi-3.5.3'],
  ['CPEPlusPlus-3.5.3-protected-portable-windows-x64.zip', 125_392_214, 'windows-portable-3.5.3'],
]

async function downloadPart(path, bytes) {
  const source = origin + '/public/downloads/' + path.split('/').map(encodeURIComponent).join('/')
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(90_000) })
      if (response.status !== 200) {
        await response.body?.cancel()
        throw new Error('HTTP ' + response.status)
      }
      const data = Buffer.from(await response.arrayBuffer())
      if (data.length !== bytes) throw new Error('expected ' + bytes + ' bytes, got ' + data.length)
      return data
    } catch (error) {
      if (attempt === 3)
        throw new Error('Cannot fetch ' + path + ': ' + error.message, { cause: error })
      await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt))
    }
  }
}

async function readPart(path, bytes) {
  const file = join(cache, path)
  const cached = await readFile(file).catch((error) => {
    if (error.code !== 'ENOENT') throw error
    return null
  })
  if (cached?.length === bytes) return cached

  const data = await downloadPart(path, bytes)
  await mkdir(dirname(file), { recursive: true })
  const temporary = file + '.' + process.pid + '.tmp'
  await writeFile(temporary, data)
  await rename(temporary, file)
  return data
}

async function stagePackage([name, bytes, folder], checksum) {
  if (!checksum) throw new Error('Missing published SHA-256 for ' + name)
  const parts = folder
    ? Array.from({ length: Math.ceil(bytes / chunkBytes) }, (_, index) => ({
        path: 'chunks/' + folder + '/' + name + '.part' + String(index).padStart(2, '0'),
        bytes: Math.min(chunkBytes, bytes - index * chunkBytes),
      }))
    : [{ path: name, bytes }]

  const hash = createHash('sha256')
  for (const part of parts) hash.update(await readPart(part.path, part.bytes))
  if (hash.digest('hex') !== checksum)
    throw new Error('SHA-256 mismatch for ' + name + '. Check the release source or clear ' + cache)

  for (const part of parts) {
    const target = join('dist', 'downloads', part.path)
    await mkdir(dirname(target), { recursive: true })
    await copyFile(join(cache, part.path), target)
  }
  console.log('Verified ' + name + ' (' + parts.length + ' file(s))')
}

const file = await readFile('public/downloads/checksums.txt', 'utf8')
const checksums = new Map(
  [...file.matchAll(/^([a-f0-9]{64}) {2}([^\r\n]+)$/gm)].map(([, hash, name]) => [name, hash])
)
await Promise.all(packages.map((item) => stagePackage(item, checksums.get(item[0]))))
