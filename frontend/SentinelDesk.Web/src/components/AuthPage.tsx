import { useEffect, useState, type FormEvent } from 'react'
import { getBootstrapStatus, login, register, requestAccess } from '../api/auth'
import { storeAuthSession } from '../auth/session'
import type { AuthSession } from '../types'

export function AuthPage({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [requiresSetup, setRequiresSetup] = useState<boolean | null>(null)
  const [mode, setMode] = useState<'login' | 'request'>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getBootstrapStatus()
      .then((status) => setRequiresSetup(status.requiresSetup))
      .catch((err) => {
        setRequiresSetup(false)
        setError(err instanceof Error ? err.message : 'Unable to reach the API')
      })
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      if (requiresSetup) {
        const session = await register(displayName, email, password)
        storeAuthSession(session)
        onAuthenticated(session)
        return
      }

      if (mode === 'request') {
        await requestAccess(displayName, email, password)
        setSuccess('Access request sent. An Admin can now approve your account from the Users page.')
        setPassword('')
        return
      }

      const session = await login(email, password)
      storeAuthSession(session)
      onAuthenticated(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  const setup = requiresSetup === true
  const requesting = !setup && mode === 'request'

  const switchMode = () => {
    setMode((current) => current === 'login' ? 'request' : 'login')
    setError('')
    setSuccess('')
    setPassword('')
  }

  return <main className="auth-shell">
    <section className="auth-panel">
      <div className="auth-brand"><span className="brand-shield">S</span><div><strong>SentinelDesk</strong><small>SECURITY OPERATIONS</small></div></div>
      <div className="auth-copy">
        <span className="eyebrow">{setup ? 'WORKSPACE SETUP' : requesting ? 'ACCESS REQUEST' : 'SECURE WORKSPACE'}</span>
        <h1>{setup ? 'Create the Admin account' : requesting ? 'Request SentinelDesk access' : 'Sign in to the SOC'}</h1>
        <p>{setup
          ? 'Initialize this SentinelDesk workspace. The first account is created as Admin.'
          : requesting
            ? 'Create your credentials now. Your account becomes active after an Admin approves your request.'
            : 'Access live incidents, telemetry, and response workflows.'}</p>
      </div>

      {requiresSetup === null ? <div className="auth-checking"><span className="spinner" /><span>Checking workspace…</span></div> : <form className="auth-form" onSubmit={submit}>
        {(setup || requesting) && <label>Display name<input required minLength={2} maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label>}
        <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label>
        <label>Password<input required type="password" minLength={8} maxLength={128} autoComplete={setup || requesting ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="auth-success" role="status">{success}</p>}
        <button className="button primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : setup ? 'Initialize workspace' : requesting ? 'Send access request' : 'Sign in'}</button>
      </form>}

      {!setup && requiresSetup !== null && <button className="auth-switch" type="button" onClick={switchMode}>
        {requesting ? 'Already have an account? Sign in' : 'Need an account? Request access'}
      </button>}
    </section>
    <aside className="auth-aside" aria-hidden="true"><div className="auth-grid-glow" /><div className="auth-signal"><span>LIVE RESPONSE</span><strong>Incidents. Telemetry. Decisions.</strong><p>One operational view, streamed in real time.</p></div></aside>
  </main>
}
