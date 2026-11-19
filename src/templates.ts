// Template dokumen. Tambah template baru: tambahkan nama di TEMPLATE_NAMES
// lalu satu fungsi di objek `templates`.
import type { Project } from './types'

export const TEMPLATE_NAMES = [
  'Berita Acara',
  'Surat Perintah Kerja',
  'Laporan Progres',
  'Surat Tugas',
  '2017 DED Pembuatan DPT Tahap II',
] as const

export type TemplateName = (typeof TEMPLATE_NAMES)[number]

export const templates: Record<TemplateName, (p: Project, tanggal: string) => string> = {
  'Berita Acara': (p, t) =>
    `Pada hari ini, ${t}, telah dilakukan pemeriksaan pekerjaan proyek ${p.nama} (${p.kode}) dengan capaian progres ${p.progres}%.\n\nDemikian berita acara ini dibuat untuk dipergunakan sebagaimana mestinya.`,
  'Surat Perintah Kerja': (p) =>
    `Yang bertanda tangan di bawah ini memerintahkan pelaksanaan pekerjaan proyek ${p.nama} (${p.kode}) untuk periode ${p.periode}, di bawah penanggung jawab ${p.pic}.`,
  'Laporan Progres': (p, t) =>
    `Per ${t}, proyek ${p.nama} (${p.kode}) berstatus ${p.status} dengan progres ${p.progres}%.\n\nPenanggung jawab: ${p.pic}.\n\n[RINCIAN PEKERJAAN]`,
  'Surat Tugas': (p) =>
    `Dengan ini menugaskan ${p.pic} untuk melaksanakan kegiatan pada proyek ${p.nama} (${p.kode}) selama periode ${p.periode}.`,
  '2017 DED Pembuatan DPT Tahap II': (p, t) =>
    `Yang bertanda tangan di bawah ini menerangkan bahwa Tenaga Ahli yang bersangkutan telah bekerja dengan baik pada proyek ${p.nama} (${p.kode}) periode ${p.periode}.\n\nDemikian surat referensi ini dibuat per tanggal ${t} untuk dipergunakan sebagaimana mestinya.`,
}