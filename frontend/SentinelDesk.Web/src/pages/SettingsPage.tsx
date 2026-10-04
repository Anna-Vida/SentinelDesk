import { useState, type FormEvent } from 'react'
import { changePassword, createUser, getUsers, type User } from '../api/auth'
import { useResource } from '../hooks/useResource'
import { ErrorState, LoadingState } from '../components/States'
import type { ConnectionState } from '../types'
export function SettingsPage({ user, connection }: { user: User; connection: ConnectionState }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError(''); setSuccess('')
    try { await changePassword(String(data.get('current')), String(data.get('next'))); form.reset(); setSuccess('Password updated.') }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to change password') }
    finally { setBusy(false) }
  }
  return <><section className="welcome compact"><div><span className="eyebrow">WORKSPACE</span><h2>Account & access</h2><p>Manage your sign-in and workspace membership.</p></div></section>
    <div className="analytics-grid"><section className="panel settings-panel"><h3>Your session</h3><dl><dt>Email</dt><dd>{user.email}</dd><dt>Role</dt><dd>{user.roles.join(', ')}</dd><dt>Live connection</dt><dd>{connection}</dd></dl><p className="muted">Viewers can read records. Analysts can manage incidents and events. Administrators can also create accounts.</p></section>
    <section className="panel settings-panel"><h3>Change password</h3><form className="stack-form" onSubmit={submit}><label>Current password<input name="current" type="password" autoComplete="current-password" required /></label><label>New password<input name="next" type="password" autoComplete="new-password" minLength={12} required /></label><p className="muted">Use at least 12 characters with uppercase, lowercase, a number and a symbol.</p>{error && <p className="form-error" role="alert">{error}</p>}{success && <p role="status">{success}</p>}<button className="button primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></form></section></div>
    {user.roles.includes('Admin') && <UserManagement />}</>
}
function UserManagement() {
  const { data, loading, error, retry } = useResource(getUsers)
  const [busy, setBusy] = useState(false); const [saveError, setSaveError] = useState(''); const [success, setSuccess] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setBusy(true); setSaveError(''); setSuccess('')
    try { await createUser(String(values.get('email')), String(values.get('password')), String(values.get('role'))); form.reset(); retry(); setSuccess('Account created. Share the credentials with the new member securely.') }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to create account') }
    finally { setBusy(false) }
  }
  return <section className="panel settings-panel user-management"><h3>Workspace members</h3>{loading ? <LoadingState /> : error ? <ErrorState message={error} retry={retry} /> : <ul className="member-list">{data?.map(user => <li key={user.id}><span>{user.email}</span><span className="badge">{user.roles.join(', ')}</span></li>)}</ul>}
    <h3>Create account</h3><form className="stack-form" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="off" required /></label><label>Initial password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label><p className="muted">Use at least 12 characters with uppercase, lowercase, a number and a symbol.</p><label>Role<select name="role" defaultValue="Viewer"><option>Viewer</option><option>Analyst</option><option>Admin</option></select></label>{saveError && <p className="form-error" role="alert">{saveError}</p>}{success && <p role="status">{success}</p>}<button className="button primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button></form></section>
}
