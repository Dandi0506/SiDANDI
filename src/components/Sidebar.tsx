import type { Page } from '../router'

const MENU: { id: Page; label: string }[] = [
  { id: 'pegawai', label: 'Data Pegawai' },
  { id: 'proyek', label: 'Data Proyek' },
  { id: 'dokumen', label: 'Generate Dokumen' },
  { id: 'timesheet', label: 'Timesheet' },
]

export function Sidebar({ page }: { page: Page }) {
  return (
    <aside>
      <div className="logo">
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#0E7C7B" />
          <path d="M10 8h8l4 4v12H10z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <path d="M13 17h6M13 21h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
        SiDANDI
      </div>
      <nav>
        {MENU.map((m) => (
          <a key={m.id} href={'#' + m.id} className={page === m.id ? 'on' : undefined}>
            {m.label}
          </a>
        ))}
      </nav>
    </aside>
  )
}
