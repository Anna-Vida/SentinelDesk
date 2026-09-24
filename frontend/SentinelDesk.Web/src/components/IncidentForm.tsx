import { useState, type FormEvent } from 'react'
import { createIncident } from '../api/incidents'
import { IncidentSeverity, type Incident } from '../types'

export function IncidentForm({ onClose, onCreated }: { onClose: () => void; onCreated: (incident: Incident) => void }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(IncidentSeverity.Medium); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try { onCreated(await createIncident({ title, description, severity })); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : 'Creation failed') }
    finally { setSaving(false) }
  }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
      <div className="modal-head"><div><span className="eyebrow">NEW CASE</span><h2 id="create-title">Create incident</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
      <form onSubmit={submit}>
        <label>Title<input autoFocus required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the detected threat" /></label>
        <label>Description<textarea required maxLength={4000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add evidence, affected assets, and context" /></label>
        <label>Severity<select value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}>{Object.values(IncidentSeverity).map((value) => <option key={value}>{value}</option>)}</select></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Creating…' : 'Create incident'}</button></div>
      </form>
    </section>
  </div>
}
