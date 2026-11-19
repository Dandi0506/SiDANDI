import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import type { Employee, Project } from '../types'


const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Isi template .docx dengan data, hasilnya berupa Blob. */
export async function renderDocx(url: string, data: Record<string, unknown>): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Template tidak ditemukan: ${url}`)
  const zip = new PizZip(await res.arrayBuffer())
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
  doc.render(data)
  return doc.getZip().generate({ type: 'blob', mimeType: DOCX_MIME })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Data yang tersedia sebagai placeholder di Word. */
export function buildData(d: {
  proyek: Project; tanggal: string; nomor: string; penandatangan?: Employee
}) {
  return {
    nomor: d.nomor,

  }
}