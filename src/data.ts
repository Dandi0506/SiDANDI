// Data contoh. Ganti dengan data dari API/database saat backend siap.
import type { Employee, Project, TimesheetRow } from './types'

export const initialEmployees: Employee[] = [
  { id: 1, nama: 'Rina Kusumawati', nip: '19850312 2010', jabatan: 'Analis Proyek', unit: 'Perencanaan', status: 'Aktif' },
  { id: 2, nama: 'Bagas Pratama', nip: '19900721 2014', jabatan: 'Insinyur Sipil', unit: 'Teknik', status: 'Aktif' },
  { id: 3, nama: 'Siti Nurhaliza', nip: '19920105 2016', jabatan: 'Staf Administrasi', unit: 'Umum', status: 'Cuti' },
  { id: 4, nama: 'Dedi Hermawan', nip: '19800930 2005', jabatan: 'Manajer Proyek', unit: 'Operasional', status: 'Aktif' },
  { id: 5, nama: 'Maya Anggraini', nip: '19950218 2019', jabatan: 'Penata Dokumen', unit: 'Dokumentasi', status: 'Aktif' },
  { id: 6, nama: 'Fajar Nugroho', nip: '19880614 2012', jabatan: 'Surveyor', unit: 'Lapangan', status: 'Nonaktif' },
]

export const projects: Project[] = [
  { kode: 'PRJ-001', nama: 'Renovasi Gedung Kantor', pic: 'Dedi Hermawan', periode: 'Jan – Jun 2026', progres: 72, status: 'Berjalan' },
  { kode: 'PRJ-002', nama: 'Pengadaan Sistem Arsip', pic: 'Rina Kusumawati', periode: 'Mar – Des 2026', progres: 35, status: 'Berjalan' },
  { kode: 'PRJ-003', nama: 'Survei Lahan Tahap II', pic: 'Fajar Nugroho', periode: 'Feb – Mei 2026', progres: 100, status: 'Selesai' },
  { kode: 'PRJ-004', nama: 'Pelatihan Pegawai', pic: 'Siti Nurhaliza', periode: 'Okt 2026 –', progres: 10, status: 'Tertunda' },
]

export const timesheetRows: TimesheetRow[] = [
  { label: 'PRJ-001 Renovasi Gedung', jam: [4, 3, 5, 4, 2, 0, 0] },
  { label: 'PRJ-002 Sistem Arsip', jam: [3, 4, 2, 3, 4, 0, 0] },
  { label: 'Administrasi Umum', jam: [1, 1, 1, 1, 2, 0, 0] },
]
