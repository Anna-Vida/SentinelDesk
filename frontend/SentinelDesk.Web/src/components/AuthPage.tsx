import { useState, type FormEvent } from 'react'
import { login, register } from '../api/auth'
import { storeAuthSession } from '../auth/session'
import { UserRole, type AuthSession } from '../types'

export function AuthPage({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole.Viewer | UserRole.Analyst>(UserRole.Analyst)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const session = mode === 'login'
        ? await login(email, password)
        : await register(displayName, email, password, role)
      storeAuthSession(session)
      onAuthenticated(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-shell">
    <section className="auth-panel">
      <div className="auth-brand"><span className="brand-shield">S</span><div><strong>SentinelDesk</strong><small>SECURITY OPERATIONS</small></div></div>
      <div className="auth-copy"><span className="eyebrow">SECURE WORKSPACE</span><h1>{mode === 'login' ? 'Sign in to the SOC' : 'Create your workspace account'}</h1><p>{mode === 'login' ? 'Access live incidents, telemetry, and response workflows.' : 'The first registered account becomes Admin. Later accounts can join as Analyst or Viewer.'}</p></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && <label>Display name<input required minLength={2} maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Anna Vida" /></label>}
        <label>Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="analyst@example.com" /></label>
        <label>Password<input required type="password" minLength={8} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
        {mode === 'register' && <label>Workspace role<select value={role} onChange={(e) => setRole(e.target.value as UserRole.Viewer | UserRole.Analyst)}><option value={UserRole.Analyst}>Analyst — investigate and update</option><option value={UserRole.Viewer}>Viewer — read only</option></select></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}</button>
    </section>
    <aside className="auth-aside" aria-hidden="true"><div className="auth-grid-glow" /><div className="auth-signal"><span>LIVE RESPONSE</span><strong>Incidents. Telemetry. Decisions.</strong><p>One operational view, streamed in real time.</p></div></aside>
  </main>
}
