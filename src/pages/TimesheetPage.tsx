// Halaman Timesheet: input jam, total otomatis, kirim.
import { useState } from 'react'
import { timesheetRows } from '../data'

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

/** Jam valid: 0-24. Input kosong/tidak valid dihitung 0. */
const hitung = (v: string): number => Math.min(24, Math.max(0, Number(v) || 0))

/** Label minggu berjalan (Senin - Minggu), mis. "16 Nov – 22 Nov 2026". */
function weekLabel(): string {
  const mon = new Date()
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  return `${f(mon)} – ${f(sun)} ${sun.getFullYear()}`
}

export default function TimesheetPage({ active }: { active: boolean }) {
  const [jam, setJam] = useState<string[][]>(() => timesheetRows.map((r) => r.jam.map(String)))
  const [sent, setSent] = useState(false)
  const [week] = useState(weekLabel)

  const setCell = (row: number, day: number, value: string) =>
    setJam((prev) => prev.map((r, ri) => (ri === row ? r.map((v, di) => (di === day ? value : v)) : r)))

  const rowTotals = jam.map((r) => r.reduce((s, v) => s + hitung(v), 0))
  const dayTotals = DAYS.map((_, d) => jam.reduce((s, r) => s + hitung(r[d]), 0))
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0)

  return (
    <section id="timesheet" className={active ? 'on' : undefined}>
      <div className="head">
        <div>
          <h1>Timesheet</h1>
          <div className="sub">Catat jam kerja per proyek untuk minggu ini.</div>
        </div>
        <b>{week}</b>
      </div>

      <div className="card scroll">
        <table className="ts">
          <thead>
            <tr>
              <th>Proyek</th>
              {DAYS.map((d) => <th key={d}>{d}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {timesheetRows.map((row, r) => (
              <tr key={row.label}>
                <td><b>{row.label}</b></td>
                {DAYS.map((d, di) => (
                  <td key={d} style={{ padding: 8 }}>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={jam[r][di]}
                      disabled={sent}
                      aria-label={`${row.label} ${d}`}
                      onChange={(e) => setCell(r, di, e.target.value)}
                    />
                  </td>
                ))}
                <td><b>{rowTotals[r]}</b></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--th)' }}>
              <td><b>Total harian</b></td>
              {dayTotals.map((t, i) => <td key={DAYS[i]}>{t}</td>)}
              <td><b>{grandTotal} jam</b></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className={`bd ${sent ? 'g' : 'a'}`}>
          {sent ? 'Terkirim – menunggu persetujuan' : 'Draf – belum dikirim'}
        </span>
        <button className="btn" disabled={sent} onClick={() => setSent(true)}>Kirim untuk Persetujuan</button>
      </div>
    </section>
  )
}
