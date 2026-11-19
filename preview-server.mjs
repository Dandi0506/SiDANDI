// preview-server.mjs — Server lokal: kelola folder/upload template (aman karakter spesial) & konversi DOCX -> PDF
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const PORT = 3001

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_ROOT = path.resolve(__dirname, 'public', 'templates')

function sanitizeSegment(str) {
  return String(str ?? '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\.+$/g, '')
    .trim()
}

// Encode relative path ke Base64URL agar koma (,), kurung (), spasi, dll. 100% aman di URL
function buildFileApiUrl(relSegments) {
  const relPath = relSegments.join('/')
  const id = Buffer.from(relPath, 'utf8').toString('base64url')
  return `http://localhost:${PORT}/api/templates/file?id=${id}`
}

async function collectDocxRecursive(dirPath, relPrefixParts) {
  const results = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('~$')) continue
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const nested = await collectDocxRecursive(fullPath, [...relPrefixParts, entry.name])
      results.push(...nested)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.docx')) {
      results.push({
        name: entry.name.replace(/\.docx$/i, ''),
        fileName: entry.name,
        url: buildFileApiUrl([...relPrefixParts, entry.name]),
      })
    }
  }

  return results
}

async function scanTemplateTree() {
  const tree = {}

  await fs.mkdir(TEMPLATES_ROOT, { recursive: true })
  const level1Entries = await fs.readdir(TEMPLATES_ROOT, { withFileTypes: true })

  for (const entry1 of level1Entries) {
    if (entry1.name.startsWith('.') || entry1.name.startsWith('~$')) continue

    if (entry1.isDirectory()) {
      const jenis = entry1.name
      const jenisDir = path.join(TEMPLATES_ROOT, jenis)
      tree[jenis] = {}

      const level2Entries = await fs.readdir(jenisDir, { withFileTypes: true })
      const directFiles = []

      for (const entry2 of level2Entries) {
        if (entry2.name.startsWith('.') || entry2.name.startsWith('~$')) continue

        if (entry2.isDirectory()) {
          const folderName = entry2.name
          const folderDir = path.join(jenisDir, folderName)
          const docxFiles = await collectDocxRecursive(folderDir, [jenis, folderName])
          tree[jenis][folderName] = docxFiles
        } else if (entry2.isFile() && entry2.name.toLowerCase().endsWith('.docx')) {
          directFiles.push({
            name: entry2.name.replace(/\.docx$/i, ''),
            fileName: entry2.name,
            url: buildFileApiUrl([jenis, entry2.name]),
          })
        }
      }

      if (directFiles.length > 0) {
        tree[jenis]['Umum'] = directFiles
      }

      if (Object.keys(tree[jenis]).length === 0) {
        tree[jenis]['Default'] = []
      }
    } else if (entry1.isFile() && entry1.name.toLowerCase().endsWith('.docx')) {
      if (!tree['Umum']) tree['Umum'] = {}
      if (!tree['Umum']['Default']) tree['Umum']['Default'] = []
      tree['Umum']['Default'].push({
        name: entry1.name.replace(/\.docx$/i, ''),
        fileName: entry1.name,
        url: buildFileApiUrl([entry1.name]),
      })
    }
  }

  return tree
}

async function readBodyBuffer(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function convertWithMsWord(inputPath, outputPath) {
  const winIn = path.win32.resolve(inputPath)
  const winOut = path.win32.resolve(outputPath)

  const psScript = `
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open("${winIn}", $false, $true, $false)
  $doc.Repaginate()
  $doc.SaveAs2([ref]"${winOut}", [ref]17)
} finally {
  if ($doc -ne $null) {
    try { $doc.Close([ref]$false) } catch {}
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null
  }
  if ($word -ne $null) {
    try { $word.Quit([ref]$false) } catch {}
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
`
  const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64')

  await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedCommand],
    { timeout: 30000 }
  )
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Jenis, X-Folder, X-Filename')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const parsedUrl = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const pathname = parsedUrl.pathname

  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, version: 2, templatesRoot: TEMPLATES_ROOT }))
    return
  }

  // 1. Pindai struktur folder & file template
  if (req.method === 'GET' && pathname === '/api/templates') {
    try {
      const tree = await scanTemplateTree()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(tree))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Gagal membaca folder templates' }))
    }
    return
  }

  // 2. Baca biner file .docx via Base64URL ID (aman untuk koma, tanda kurung, titik, spasi)
  if (req.method === 'GET' && pathname === '/api/templates/file') {
    try {
      const id = parsedUrl.searchParams.get('id') ?? ''
      const relPath = id
        ? Buffer.from(id, 'base64url').toString('utf8')
        : (parsedUrl.searchParams.get('path') ?? '')

      const resolvedPath = path.resolve(TEMPLATES_ROOT, relPath)

      if (!resolvedPath.startsWith(TEMPLATES_ROOT)) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Akses ditolak' }))
        return
      }

      const fileBuf = await fs.readFile(resolvedPath)
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Length': fileBuf.length,
        'Cache-Control': 'no-store',
      })
      res.end(fileBuf)
    } catch (err) {
      console.error('[ERROR BACA FILE TEMPLATE]:', err)
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'File template tidak ditemukan' }))
    }
    return
  }

  // 3. Buat Jenis / Folder Dokumen baru
  if (req.method === 'POST' && pathname === '/api/templates/folder') {
    try {
      const raw = (await readBodyBuffer(req)).toString('utf8')
      const body = JSON.parse(raw || '{}')
      const jenis = sanitizeSegment(body.jenis)
      const folder = sanitizeSegment(body.folder)

      if (!jenis || !folder) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Nama jenis dokumen dan nama folder wajib diisi' }))
        return
      }

      const targetDir = path.join(TEMPLATES_ROOT, jenis, folder)
      await fs.mkdir(targetDir, { recursive: true })

      const tree = await scanTemplateTree()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, jenis, folder, tree }))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Gagal membuat folder' }))
    }
    return
  }

  // 4. Impor (Upload) file .docx ke dalam Jenis / Folder tertentu
  if (req.method === 'POST' && pathname === '/api/templates/upload') {
    try {
      const jenis = sanitizeSegment(decodeURIComponent(String(req.headers['x-jenis'] ?? '')))
      const folder = sanitizeSegment(decodeURIComponent(String(req.headers['x-folder'] ?? '')))
      const rawFilename = sanitizeSegment(decodeURIComponent(String(req.headers['x-filename'] ?? '')))

      if (!jenis || !folder || !rawFilename) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Header jenis, folder, dan nama file wajib diisi' }))
        return
      }

      if (!rawFilename.toLowerCase().endsWith('.docx')) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Hanya file berformat .docx yang didukung' }))
        return
      }

      const fileBuffer = await readBodyBuffer(req)
      if (!fileBuffer.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Isi file kosong' }))
        return
      }

      if (fileBuffer.length < 4 || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4b) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            error: `File "${rawFilename}" bukan format .docx asli (kemungkinan file .doc lama). Buka di Word lalu Save As -> Word Document (.docx).`,
          })
        )
        return
      }

      const targetDir = path.join(TEMPLATES_ROOT, jenis, folder)
      await fs.mkdir(targetDir, { recursive: true })
      const targetFile = path.join(targetDir, rawFilename)
      await fs.writeFile(targetFile, fileBuffer)

      const tree = await scanTemplateTree()
      const fileUrl = buildFileApiUrl([jenis, folder, rawFilename])

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, url: fileUrl, tree }))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Gagal mengunggah file template' }))
    }
    return
  }

  // 5. Konversi DOCX -> PDF via MS Word
  if (req.method === 'POST' && pathname === '/api/preview-pdf') {
    let tmpDir = ''
    try {
      const docxBuffer = await readBodyBuffer(req)
      if (!docxBuffer.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'File DOCX kosong' }))
        return
      }

      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sidandi-preview-'))
      const inputPath = path.join(tmpDir, 'document.docx')
      const outputPath = path.join(tmpDir, 'document.pdf')
      await fs.writeFile(inputPath, docxBuffer)

      await convertWithMsWord(inputPath, outputPath)
      const pdfBuffer = await fs.readFile(outputPath)

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
      })
      res.end(pdfBuffer)
    } catch (err) {
      console.error('[ERROR MS WORD PDF]:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Gagal mengonversi via Microsoft Word',
        })
      )
    } finally {
      if (tmpDir) {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      }
    }
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} masih dipakai proses lama. Hentikan dulu dengan taskkill lalu jalankan ulang.`)
    process.exit(1)
  }
  throw err
})

server.listen(PORT, () => {
  console.log(`Server pratinjau v2 aktif di http://localhost:${PORT}`)
  console.log(`Direktori template: ${TEMPLATES_ROOT}`)
})