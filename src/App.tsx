import { useState } from 'react'
import { initialEmployees, projects } from './data'
import type { Employee } from './types'
import { goTo, useHashPage } from './router'
import { Sidebar } from './components/Sidebar'
import PegawaiPage from './pages/PegawaiPage'
import ProyekPage from './pages/ProyekPage'
import DokumenPage from './pages/DokumenPage'
import TimesheetPage from './pages/TimesheetPage'

export default function App() {
  const page = useHashPage()
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [docProject, setDocProject] = useState(0) // proyek terpilih di halaman Dokumen

  const addEmployee = (e: Omit<Employee, 'id'>) =>
    setEmployees((prev) => [...prev, { ...e, id: Math.max(0, ...prev.map((x) => x.id)) + 1 }])

  const deleteEmployee = (id: number) =>
    setEmployees((prev) => prev.filter((e) => e.id !== id))

  // Semua halaman tetap ter-mount (hanya disembunyikan lewat CSS)
  // supaya isian form/timesheet tidak hilang saat pindah menu.
  return (
    <div className="app">
      <Sidebar page={page} />
      <main>
        <PegawaiPage active={page === 'pegawai'} employees={employees} onAdd={addEmployee} onDelete={deleteEmployee} />
        <ProyekPage
          active={page === 'proyek'}
          projects={projects}
          onGenerate={(i) => { setDocProject(i); goTo('dokumen') }}
        />
        <DokumenPage
          active={page === 'dokumen'}
          projects={projects}
          employees={employees}
          projectIndex={docProject}
          onProjectChange={setDocProject}
        />
        <TimesheetPage active={page === 'timesheet'} />
      </main>
    </div>
  )
}
