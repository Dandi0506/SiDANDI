# SiDANDI

Aplikasi dokumentasi: data pegawai, data proyek, generate dokumen, dan timesheet.
Dibangun dengan Vite + React + TypeScript.

## Menjalankan
Butuh Node.js 20.19+ (atau 22.12+).

    npm install
    npm run dev       # http://localhost:5173
    npm run build     # cek tipe (tsc) + build produksi ke dist/
    npm run lint
    npm run preview

## Struktur
    index.html
    src/main.tsx             titik masuk
    src/App.tsx              state utama + menyusun halaman
    src/router.ts            router hash (useHashPage, goTo)
    src/types.ts             tipe data (Employee, Project, ...)
    src/data.ts              data contoh
    src/templates.ts         template dokumen
    src/utils.ts             helper kecil
    src/style.css            seluruh gaya (termasuk aturan cetak)
    src/components/          Sidebar, Badge
    src/pages/               PegawaiPage, ProyekPage, DokumenPage, TimesheetPage

## Catatan
- Data masih di memori (hilang saat reload). Ganti `src/data.ts` dengan pemanggilan API.
- Tambah template dokumen: edit `src/templates.ts`.
- Cetak hanya dokumen: aturan `@media print` di akhir `src/style.css`.
