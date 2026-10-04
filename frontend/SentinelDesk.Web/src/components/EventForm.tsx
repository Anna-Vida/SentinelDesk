import { useState, type FormEvent } from 'react'
import { createSecurityEvent } from '../api/securityEvents'
import { Modal } from './Modal'
export function EventForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setBusy(true); setError('')
    try { await createSecurityEvent({ eventType: String(values.get('eventType')).trim(), sourceIp: String(values.get('sourceIp')).trim(), description: String(values.get('description')).trim(), riskScore: Number(values.get('riskScore')) }); onCreated(); onClose() }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to record event') }
    finally { setBusy(false) }
  }
  return <Modal title="Record security event" eyebrow="NEW SIGNAL" onClose={onClose} busy={busy}><form onSubmit={submit}>
    <label>Event type<input name="eventType" required maxLength={100} autoFocus placeholder="Suspicious login" /></label><label>Source IP<input name="sourceIp" required maxLength={45} placeholder="192.0.2.10 or 2001:db8::1" /></label><label>Description<textarea name="description" required maxLength={4000} rows={4} /></label><label>Risk score (0–100)<input name="riskScore" type="number" required min={0} max={100} step={1} defaultValue={50} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="button ghost" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Record event'}</button></div></form></Modal>
}
