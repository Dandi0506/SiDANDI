import type { EmployeeStatus, ProjectStatus } from '../types'
import { statusClass } from '../utils'

export function Badge({ status }: { status: EmployeeStatus | ProjectStatus }) {
  return <span className={`bd ${statusClass[status]}`}>{status}</span>
}
