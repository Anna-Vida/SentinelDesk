import type { Incident } from '../types'
import { formatDate, shortId } from '../utils/format'
import { SeverityBadge, StatusBadge } from './Badges'

export function IncidentTable({ incidents, onSelect }: { incidents: Incident[]; onSelect: (incident: Incident) => void }) {
  return <div className="table-wrap"><table>
    <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Created</th><th><span className="sr-only">View</span></th></tr></thead>
    <tbody>{incidents.map((incident) => <tr key={incident.id}>
      <td><button className="title-link" onClick={() => onSelect(incident)}><small>#{shortId(incident.id)}</small>{incident.title}</button></td>
      <td><SeverityBadge value={incident.severity} /></td><td><StatusBadge value={incident.status} /></td>
      <td>{formatDate(incident.createdAt)}</td><td><button className="icon-button" aria-label={`View ${incident.title}`} onClick={() => onSelect(incident)}>›</button></td>
    </tr>)}</tbody>
  </table></div>
}
