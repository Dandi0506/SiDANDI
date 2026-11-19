// Helper untuk membaca placeholder & mengisi template Word (.docx) menggunakan docxtemplater.
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import type { Project } from './types'

export interface DocxInput {
  proyek: Project | undefined
  tanggal: string
  nomor: string
  customValues?: Record<string, string>
}

async function fetchDocxArrayBuffer(templateUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(templateUrl)
  if (!res.ok) {
    throw new Error(`Template "${templateUrl}" tidak ditemukan (${res.status})`)
  }
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  // Header ZIP standar (.docx) selalu diawali byte 0x50 0x4B ("PK")
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error(
      `File "${templateUrl}" bukan arsip .docx yang valid (kemungkinan file tidak ada di server atau berformat .doc lama).`
    )
  }
  return buffer
}

export async function extractPlaceholders(templateUrl: string): Promise<string[]> {
  const buffer = await fetchDocxArrayBuffer(templateUrl)
  const zip = new PizZip(buffer)

  const xmlFiles = Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(name)
  )

  const found: string[] = []
  const seen = new Set<string>()

  for (const fileName of xmlFiles) {
    const file = zip.file(fileName)
    if (!file) continue
    const xml = file.asText()
    const plainText = xml.replace(/<[^>]+>/g, '')
    const matches = plainText.matchAll(/\{([^{}]+)\}/g)
    for (const m of matches) {
      const rawKey = m[1].trim()
      if (!rawKey || /^[#/^]/.test(rawKey)) continue
      if (!seen.has(rawKey)) {
        seen.add(rawKey)
        found.push(rawKey)
      }
    }
  }

  return found
}

export async function extractFolderPlaceholders(
  files: Array<{ name: string; url: string }>
): Promise<{ allKeys: string[]; keyToFiles: Record<string, string[]> }> {
  const allKeys: string[] = []
  const seen = new Set<string>()
  const keyToFiles: Record<string, string[]> = {}

  await Promise.all(
    files.map(async (file) => {
      try {
        const keys = await extractPlaceholders(file.url)
        for (const k of keys) {
          if (!keyToFiles[k]) keyToFiles[k] = []
          if (!keyToFiles[k].includes(file.name)) {
            keyToFiles[k].push(file.name)
          }
          if (!seen.has(k)) {
            seen.add(k)
            allKeys.push(k)
          }
        }
      } catch (err) {
        console.warn(`Gagal memindai placeholder di ${file.name}:`, err)
      }
    })
  )

  return { allKeys, keyToFiles }
}

export function buildData({ proyek, tanggal, nomor, customValues }: DocxInput) {
  const baseData: Record<string, string> = {
    nomor,
    nomor_dokumen: nomor,
    tanggal,
    tanggal_dokumen: tanggal,

    kode_proyek: proyek?.kode ?? '',
    nama_proyek: proyek?.nama ?? '',
    pic: proyek?.pic ?? '',
    pic_proyek: proyek?.pic ?? '',
    periode: proyek?.periode ?? '',
    periode_proyek: proyek?.periode ?? '',
    waktu_pelaksanaan: proyek?.periode ?? '',
    progres: proyek ? `${proyek.progres}%` : '',
    status_proyek: proyek?.status ?? '',
  }

  if (customValues) {
    for (const [k, v] of Object.entries(customValues)) {
      baseData[k] = v ?? ''
    }
  }

  return baseData
}

export async function renderDocx(templateUrl: string, data: Record<string, unknown>): Promise<Blob> {
  const buffer = await fetchDocxArrayBuffer(templateUrl)
  const zip = new PizZip(buffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })

  doc.render(data)

  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

export async function createZipFromBlobs(
  items: Array<{ filename: string; blob: Blob }>
): Promise<Blob> {
  const zip = new PizZip()
  for (const item of items) {
    const buf = await item.blob.arrayBuffer()
    zip.file(item.filename, buf)
  }
  return zip.generate({
    type: 'blob',
    mimeType: 'application/zip',
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}