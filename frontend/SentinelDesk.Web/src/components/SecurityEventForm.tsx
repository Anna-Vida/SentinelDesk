import { useState, type FormEvent } from 'react'
import { createSecurityEvent } from '../api/securityEvents'
import type { Incident, SecurityEvent } from '../types'

export function SecurityEventForm({ incidents, onClose, onCreated }: {
  incidents: Incident[]
  onClose: () => void
  onCreated: (event: SecurityEvent) => void
}) {
  const [eventType, setEventType] = useState('')
  const [sourceIp, setSourceIp] = useState('')
  const [description, setDescription] = useState('')
  const [riskScore, setRiskScore] = useState('50')
  const [incidentId, setIncidentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const created = await createSecurityEvent({
        eventType,
        sourceIp,
        description,
        riskScore: Number(riskScore),
        ...(incidentId ? { incidentId } : {}),
      })
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create security event')
    } finally {
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="event-create-title">
      <div className="modal-head"><div><span className="eyebrow">TELEMETRY INGEST</span><h2 id="event-create-title">Record security event</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
      <form onSubmit={submit}>
        <div className="form-grid two-column">
          <label>Event type<input required maxLength={100} value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="AuthenticationFailure" /></label>
          <label>Source IP<input required maxLength={45} value={sourceIp} onChange={(e) => setSourceIp(e.target.value)} placeholder="198.51.100.42" /></label>
        </div>
        <label>Description<textarea required maxLength={4000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the observed signal and affected system" /></label>
        <div className="form-grid two-column">
          <label>Risk score<input required type="number" min="0" max="100" value={riskScore} onChange={(e) => setRiskScore(e.target.value)} /><small className="field-hint">0 = informational · 100 = critical</small></label>
          <label>Link to incident <span className="optional">optional</span><select value={incidentId} onChange={(e) => setIncidentId(e.target.value)}><option value="">Leave unlinked</option>{incidents.map((incident) => <option key={incident.id} value={incident.id}>{incident.title}</option>)}</select></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Recording…' : 'Record event'}</button></div>
      </form>
    </section>
  </div>
}
