// Halaman Data Pegawai: cari, filter status, tambah, hapus.
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Employee, EmployeeStatus } from '../types'
import { Badge } from '../components/Badge'
import { initials } from '../utils'

type Filter = 'Semua' | EmployeeStatus
type NewEmployee = Omit<Employee, 'id'>

const FILTERS: Filter[] = ['Semua', 'Aktif', 'Cuti', 'Nonaktif']
const STATUSES: EmployeeStatus[] = ['Aktif', 'Cuti', 'Nonaktif']
const EMPTY: NewEmployee = { nama: '', nip: '', jabatan: '', unit: '', status: 'Aktif' }

interface Props {
  active: boolean
  employees: Employee[]
  onAdd: (e: NewEmployee) => void
  onDelete: (id: number) => void
}

export default function PegawaiPage({ active, employees, onAdd, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('Semua')
  const [form, setForm] = useState<NewEmployee>(EMPTY)
  const dialog = useRef<HTMLDialogElement>(null)

  const q = query.toLowerCase()
  const list = employees.filter(
    (e) => (filter === 'Semua' || e.status === filter) && (e.nama + e.nip).toLowerCase().includes(q),
  )

  const openDialog = () => {
    setForm(EMPTY)
    dialog.current?.showModal()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onAdd({
      nama: form.nama.trim(),
      nip: form.nip.trim(),
      jabatan: form.jabatan.trim(),
      unit: form.unit.trim(),
      status: form.status,
    })
    dialog.current?.close()
  }

  const remove = (e: Employee) => {
    if (confirm(`Hapus pegawai ${e.nama}?`)) onDelete(e.id)
  }

  return (
    <section id="pegawai" className={active ? 'on' : undefined}>
      <div className="head">
        <div>
          <h1>Data Pegawai</h1>
          <div className="sub">Kelola data seluruh pegawai dan penugasannya.</div>
        </div>
        <button className="btn" onClick={openDialog}>+ Tambah Pegawai</button>
      </div>

      <div className="row">
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            type="search"
            aria-label="Cari pegawai"
            placeholder="Cari nama atau NIP"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="row">
          {FILTERS.map((f) => (
            <button key={f} className={`btn ${f === filter ? 'on' : 'o'}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card scroll">
        <table>
          <thead>
            <tr><th>Nama</th><th>NIP</th><th>Jabatan</th><th>Unit</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={6}>Tidak ada data.</td></tr>
            )}
            {list.map((e) => (
              <tr key={e.id}>
                <td><span className="av">{initials(e.nama)}</span>{e.nama}</td>
                <td>{e.nip}</td>
                <td>{e.jabatan}</td>
                <td>{e.unit}</td>
                <td><Badge status={e.status} /></td>
                <td>
                  <button className="btn o" aria-label={`Hapus ${e.nama}`} onClick={() => remove(e)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sub">Menampilkan {list.length} dari {employees.length} pegawai</div>

      <dialog ref={dialog}>
        <form onSubmit={submit}>
          <b style={{ fontSize: 16 }}>Tambah Pegawai</b>
          <div>
            <label htmlFor="fN">Nama</label>
            <input id="fN" required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div>
            <label htmlFor="fNip">NIP</label>
            <input id="fNip" required value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
          </div>
          <div>
            <label htmlFor="fJ">Jabatan</label>
            <input id="fJ" required value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
          </div>
          <div>
            <label htmlFor="fU">Unit</label>
            <input id="fU" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <label htmlFor="fS">Status</label>
            <select id="fS" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EmployeeStatus })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn o" onClick={() => dialog.current?.close()}>Batal</button>
            <button type="submit" className="btn">Simpan</button>
          </div>
        </form>
      </dialog>
    </section>
  )
}
