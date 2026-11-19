// Halaman Data Proyek: tabel proyek + tombol "Generate Dokumen".
import type { Project } from '../types'
import { Badge } from '../components/Badge'

interface Props {
  active: boolean
  projects: Project[]
  onGenerate: (index: number) => void
}

export default function ProyekPage({ active, projects, onGenerate }: Props) {
  return (
    <section id="proyek" className={active ? 'on' : undefined}>
      <div className="head">
        <div>
          <h1>Data Proyek</h1>
          <div className="sub">Pantau proyek, progres, dan dokumen terkait.</div>
        </div>
      </div>
      <div className="card scroll">
        <table>
          <thead>
            <tr><th>Kode</th><th>Nama Proyek</th><th>PIC</th><th>Periode</th><th>Progres</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr key={p.kode}>
                <td>{p.kode}</td>
                <td><b>{p.nama}</b></td>
                <td>{p.pic}</td>
                <td>{p.periode}</td>
                <td>
                  <span className="bar"><i style={{ width: `${p.progres}%` }} /></span>
                  {p.progres}%
                </td>
                <td><Badge status={p.status} /></td>
                <td><button className="btn o" onClick={() => onGenerate(i)}>Generate Dokumen</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
