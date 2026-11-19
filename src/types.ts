// Tipe data yang dipakai di seluruh aplikasi.

export type EmployeeStatus = 'Aktif' | 'Cuti' | 'Nonaktif'
export type ProjectStatus = 'Berjalan' | 'Selesai' | 'Tertunda'


export interface Employee {
  id: number
  nama: string
  nip: string
  jabatan: string
  unit: string
  status: EmployeeStatus
}

export interface Project {
  kode: string
  nama: string
  pic: string      // penanggung jawab
  periode: string
  progres: number  // 0-100
  status: ProjectStatus
}

/** Satu baris timesheet: label proyek + jam kerja Senin..Minggu. */
export interface TimesheetRow {
  label: string
  jam: number[]
}
