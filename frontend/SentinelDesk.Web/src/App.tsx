import { useCallback, useEffect, useState } from 'react'
import { getMe, logout, type User } from './api/auth'
import { ApiError, resetCsrfToken } from './api/client'
import { IncidentDetail } from './components/IncidentDetail'
import { IncidentForm } from './components/IncidentForm'
import { Layout, type Section } from './components/Layout'
import { ErrorState, LoadingState } from './components/States'
import { useSecurityHub, type RealtimeEvent } from './hooks/useSecurityHub'
import { DashboardPage } from './pages/DashboardPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { SecurityEventsPage } from './pages/SecurityEventsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const check = useCallback(async () => {
    setLoading(true); setError('')
    try { setUser(await getMe()) }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) setError('Unable to reach SentinelDesk. Check that the API is running.'); setUser(null) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void check() }, [check])
  useEffect(() => { const expired = () => { resetCsrfToken(); setUser(null) }; window.addEventListener('session-expired', expired); return () => window.removeEventListener('session-expired', expired) }, [])
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} retry={check} />
  return user ? <Workspace user={user} onLogout={() => setUser(null)} /> : <LoginPage onLogin={setUser} />
}
function Workspace({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('Dashboard')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [revision, setRevision] = useState(0); const [toast, setToast] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const canWrite = user.roles.some(role => role === 'Admin' || role === 'Analyst')
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  const handleRealtime = useCallback((event: RealtimeEvent) => {
    refresh()
    if (event.name === 'IncidentCreated') setToast(`New incident: ${event.payload.title}`)
    if (event.name === 'SecurityEventCreated') setToast(`Security event: ${event.payload.eventType}`)
  }, [refresh])
  const connection = useSecurityHub(handleRealtime, refresh)
  useEffect(() => {
    // Resynchronise after missed broadcasts, returning to the tab, or a reconnect.
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    const timer = window.setInterval(visible, 60000)
    document.addEventListener('visibilitychange', visible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [refresh])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer) }, [toast])
  async function signOut() {
    setSigningOut(true)
    try { await logout(); onLogout() }
    catch (error) { if (error instanceof ApiError && error.status === 401) onLogout(); else setToast('Sign-out failed. Please try again.') }
    finally { setSigningOut(false) }
  }
  return <Layout section={section} onNavigate={setSection} connection={connection} user={user} onLogout={signOut} signingOut={signingOut}>
    {section === 'Dashboard' && <DashboardPage revision={revision} onSelect={item => setSelectedId(item.id)} onNewIncident={canWrite ? () => setCreating(true) : undefined} />}
    {section === 'Incidents' && <IncidentsPage revision={revision} onSelect={item => setSelectedId(item.id)} onNewIncident={canWrite ? () => setCreating(true) : undefined} />}
    {section === 'Security Events' && <SecurityEventsPage revision={revision} onChanged={refresh} canWrite={canWrite} onSelectIncident={setSelectedId} />}
    {section === 'Analytics' && <AnalyticsPage revision={revision} />}
    {section === 'Settings' && <SettingsPage user={user} connection={connection} />}
    {creating && <IncidentForm onClose={() => setCreating(false)} onCreated={refresh} />}
    {selectedId && <IncidentDetail key={selectedId} id={selectedId} revision={revision} canWrite={canWrite} onClose={() => setSelectedId(null)} onChanged={refresh} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </Layout>
}
