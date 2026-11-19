// Router berbasis hash: #pegawai, #proyek, #dokumen, #timesheet.
import { useSyncExternalStore } from 'react'

export const PAGES = ['pegawai', 'proyek', 'dokumen', 'timesheet'] as const
export type Page = (typeof PAGES)[number]

function currentPage(): Page {
  const h = location.hash.slice(1)
  return (PAGES as readonly string[]).includes(h) ? (h as Page) : 'pegawai'
}

function subscribe(onChange: () => void): () => void {
  addEventListener('hashchange', onChange)
  return () => removeEventListener('hashchange', onChange)
}

/** Halaman aktif, mengikuti location.hash. */
export function useHashPage(): Page {
  return useSyncExternalStore(subscribe, currentPage, () => 'pegawai')
}

export function goTo(page: Page): void {
  location.hash = '#' + page
}
