import { useState, type FormEvent } from 'react'
import { login, type User } from '../api/auth'
export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setBusy(true); setError('')
    try { onLogin(await login(String(values.get('email')), String(values.get('password')))) }
    catch (error) { setError(error instanceof Error ? error.message : 'Sign-in failed') }
    finally { setBusy(false) }
  }
  return <main className="login-shell"><section className="panel login-panel"><span className="brand-shield">S</span><span className="eyebrow">SECURITY OPERATIONS</span><h1>Welcome to SentinelDesk</h1><p className="muted">Sign in to your incident response workspace.</p>
    <form className="stack-form" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="username" required autoFocus /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form><p className="muted">Need access? Ask your workspace administrator.</p>
  </section></main>
}
