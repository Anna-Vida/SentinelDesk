import { useEffect, useState, type FormEvent } from 'react'
import { createUser, getUsers, type WorkspaceUser } from '../api/users'
import { UserRole } from '../types'
import { formatDate } from '../utils/format'
import { EmptyState, ErrorState, LoadingState } from '../components/States'

export function UsersPage() {
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(UserRole.Analyst)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')

    try {
      const created = await createUser({ displayName, email, password, role })
      setUsers((current) => [...current, created].sort((a, b) => a.displayName.localeCompare(b.displayName)))
      setDisplayName('')
      setEmail('')
      setPassword('')
      setRole(UserRole.Analyst)
      setCreating(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create account')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <section className="welcome compact">
      <div><span className="eyebrow">ACCESS CONTROL</span><h2>Workspace users</h2><p>Create role-scoped accounts for analysts, viewers, and additional administrators.</p></div>
      <button className="button primary" onClick={() => setCreating(true)}>＋ Create user</button>
    </section>

    <section className="panel">
      {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={load} /> : users.length ? <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Created</th></tr></thead>
          <tbody>{users.map((user) => <tr key={user.id}>
            <td><strong>{user.displayName}</strong></td>
            <td>{user.email}</td>
            <td><span className={`role-badge role-${user.role.toLowerCase()}`}>{user.role}</span></td>
            <td>{formatDate(user.createdAt)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState title="No users yet" detail="Create an account to give someone access to the workspace." />}
    </section>

    {creating && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCreating(false)}>
      <section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
        <div className="modal-head"><div><span className="eyebrow">ACCESS PROVISIONING</span><h2 id="create-user-title">Create workspace user</h2></div><button className="icon-button" onClick={() => setCreating(false)} aria-label="Close">×</button></div>
        <form onSubmit={submit}>
          <label>Display name<input required minLength={2} maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Temporary password<input required type="password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>{Object.values(UserRole).map((value) => <option key={value}>{value}</option>)}</select></label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="modal-actions"><button type="button" className="button ghost" onClick={() => setCreating(false)}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Creating…' : 'Create user'}</button></div>
        </form>
      </section>
    </div>}
  </>
}
