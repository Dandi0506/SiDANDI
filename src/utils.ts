import type { EmployeeStatus, ProjectStatus } from './types'

/** Status -> class badge di style.css (g hijau, a kuning, s abu, b biru). */
export const statusClass: Record<EmployeeStatus | ProjectStatus, string> = {
  Aktif: 'g',
  Cuti: 'a',
  Nonaktif: 's',
  Berjalan: 'b',
  Selesai: 'g',
  Tertunda: 'a',
}

/** "Rina Kusumawati" -> "RK" (inisial untuk avatar). */
export const initials = (nama: string): string =>
  nama.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
