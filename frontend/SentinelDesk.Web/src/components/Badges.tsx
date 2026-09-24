import type { IncidentSeverity, IncidentStatus } from '../types'

export function SeverityBadge({ value }: { value: IncidentSeverity }) {
  return <span className={`badge severity-${value.toLowerCase()}`}>{value}</span>
}

export function StatusBadge({ value }: { value: IncidentStatus }) {
  return <span className={`badge status-${value.toLowerCase()}`}>{value}</span>
}

export function RiskScore({ value }: { value: number }) {
  const level = value >= 80 ? 'critical' : value >= 60 ? 'high' : value >= 30 ? 'medium' : 'low'
  return <div className="risk" aria-label={`Risk score ${value} out of 100`}>
    <span>{value}</span><div className="risk-track"><div className={`risk-fill ${level}`} style={{ width: `${value}%` }} /></div>
  </div>
}
