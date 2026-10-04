import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { createIncident, updateIncident } from '../api/incidents'
import { IncidentSeverity, type Incident } from '../types'

export function IncidentForm({ onClose, onCreated, incident }: { onClose: () => void; onCreated: (incident: Incident) => void; incident?: Incident }) {
  const [title, setTitle] = useState(incident?.title ?? ''); const [description, setDescription] = useState(incident?.description ?? '')
  const [severity, setSeverity] = useState(incident?.severity ?? IncidentSeverity.Medium); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try { onCreated(incident ? await updateIncident(incident.id, { title: title.trim(), description: description.trim(), severity }) : await createIncident({ title: title.trim(), description: description.trim(), severity })); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : 'Creation failed') }
    finally { setSaving(false) }
  }
  return <Modal title={incident ? 'Edit incident' : 'Create incident'} eyebrow={incident ? 'CASE DETAILS' : 'NEW CASE'} onClose={onClose} busy={saving}>
      <form onSubmit={submit}>
        <label>Title<input autoFocus required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the detected threat" /></label>
        <label>Description<textarea required maxLength={4000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add evidence, affected assets, and context" /></label>
        <label>Severity<select value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}>{Object.values(IncidentSeverity).map((value) => <option key={value}>{value}</option>)}</select></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button ghost" disabled={saving} onClick={onClose}>Cancel</button><button className="button primary" disabled={saving || !title.trim() || !description.trim()}>{saving ? 'Saving…' : incident ? 'Save changes' : 'Create incident'}</button></div>
      </form>
  </Modal>
}
