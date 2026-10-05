import { useState, type FormEvent } from 'react'
import { linkSecurityEvent } from '../api/securityEvents'
import type { Incident, SecurityEvent } from '../types'

export function EventLinkDialog({ securityEvent, incidents, onClose, onLinked }: {
  securityEvent: SecurityEvent
  incidents: Incident[]
  onClose: () => void
  onLinked: (event: SecurityEvent) => void
}) {
  const [incidentId, setIncidentId] = useState(securityEvent.incidentId ?? incidents[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!incidentId) return
    setSaving(true)
    setError('')
    try {
      const updated = await linkSecurityEvent(securityEvent.id, incidentId)
      onLinked(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to link security event')
    } finally {
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="event-link-title">
      <div className="modal-head"><div><span className="eyebrow">INCIDENT CORRELATION</span><h2 id="event-link-title">Link security event</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
      <p className="description">Associate <strong>{securityEvent.eventType}</strong> from <code>{securityEvent.sourceIp}</code> with an active incident.</p>
      {incidents.length ? <form onSubmit={submit}>
        <label>Incident<select required value={incidentId} onChange={(e) => setIncidentId(e.target.value)}>{incidents.map((incident) => <option key={incident.id} value={incident.id}>{incident.title}</option>)}</select></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving || !incidentId}>{saving ? 'Linking…' : 'Link event'}</button></div>
      </form> : <div className="state-card compact-state"><strong>No active incidents</strong><span>Create an incident before linking telemetry.</span></div>}
    </section>
  </div>
}
