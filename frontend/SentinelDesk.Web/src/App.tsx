import { useCallback, useEffect, useState } from 'react'
import { getIncidents } from './api/incidents'
import { getSecurityEvents } from './api/securityEvents'
import { clearAuthSession, getAuthSession } from './auth/session'
import { AuthPage } from './components/AuthPage'
import { IncidentDetail } from './components/IncidentDetail'
import { IncidentForm } from './components/IncidentForm'
import { Layout, type Section } from './components/Layout'
import { useSecurityHub, type RealtimeEvent } from './hooks/useSecurityHub'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DashboardPage } from './pages/DashboardPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { SecurityEventsPage } from './pages/SecurityEventsPage'
import { UsersPage } from './pages/UsersPage'
import { UserRole, type AuthSession, type Incident, type SecurityEvent } from './types'

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession())
  const [section, setSection] = useState<Section>('Dashboard')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [selected, setSelected] = useState<Incident | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(Boolean(session))
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [toast, setToast] = useState('')

  const loadData = useCallback(async () => {
    if (!session) return
    setLoading(true); setError('')
    try {
      const [incidentData, eventData] = await Promise.all([getIncidents({ pageSize: 100 }), getSecurityEvents()])
      setIncidents(incidentData.items); setEvents(eventData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach the API')
    } finally { setLoading(false) }
  }, [session])

  useEffect(() => { if (session) void loadData() }, [session, loadData])
  useEffect(() => {
    const expire = () => { setSession(null); setIncidents([]); setEvents([]); setSelected(null); setCreating(false); setSection('Dashboard') }
    window.addEventListener('sentineldesk:auth-expired', expire)
    return () => window.removeEventListener('sentineldesk:auth-expired', expire)
  }, [])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4000); return () => window.clearTimeout(timer) }, [toast])

  const upsertIncident = useCallback((item: Incident) => setIncidents((current) => [item, ...current.filter((candidate) => candidate.id !== item.id)].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))), [])
  const upsertSecurityEvent = useCallback((item: SecurityEvent) => setEvents((current) => [item, ...current.filter((candidate) => candidate.id !== item.id)].sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt))), [])

  const handleRealtime = useCallback((event: RealtimeEvent) => {
    setRevision((value) => value + 1)
    switch (event.name) {
      case 'IncidentCreated': { const item: Incident = { ...event.payload, isArchived: false, archivedAt: null, updatedAt: event.payload.createdAt }; upsertIncident(item); setToast(`New incident: ${item.title}`); break }
      case 'IncidentUpdated': setIncidents((current) => current.map((item) => item.id === event.payload.id ? { ...item, ...event.payload } : item)); setSelected((item) => item?.id === event.payload.id ? { ...item, ...event.payload } : item); break
      case 'IncidentStatusChanged': setIncidents((current) => current.map((item) => item.id === event.payload.incidentId ? { ...item, status: event.payload.newStatus, updatedAt: event.payload.updatedAt } : item)); setSelected((item) => item?.id === event.payload.incidentId ? { ...item, status: event.payload.newStatus, updatedAt: event.payload.updatedAt } : item); break
      case 'IncidentArchived': setIncidents((current) => current.filter((item) => item.id !== event.payload.incidentId)); setSelected((item) => item?.id === event.payload.incidentId ? null : item); break
      case 'SecurityEventCreated': upsertSecurityEvent(event.payload); setToast(`Security event: ${event.payload.eventType}`); break
      case 'SecurityEventLinked': setEvents((current) => current.map((item) => item.id === event.payload.eventId ? { ...item, incidentId: event.payload.incidentId } : item)); break
    }
  }, [upsertIncident, upsertSecurityEvent])

  const connection = useSecurityHub(handleRealtime, session?.token ?? null)
  const logout = () => { clearAuthSession(); setSession(null); setIncidents([]); setEvents([]); setSelected(null); setCreating(false); setSection('Dashboard') }

  if (!session) return <AuthPage onAuthenticated={setSession} />

  const canManage = session.user.role === UserRole.Analyst || session.user.role === UserRole.Admin
  const canArchive = session.user.role === UserRole.Admin
  const removeIncident = (id: string) => { setIncidents((items) => items.filter((item) => item.id !== id)); setRevision((value) => value + 1) }

  return <Layout section={section} onNavigate={setSection} connection={connection} user={session.user} onLogout={logout}>
    {section === 'Dashboard' && <DashboardPage incidents={incidents} events={events} loading={loading} error={error} onRetry={loadData} onSelect={setSelected} onNewIncident={() => setCreating(true)} canManage={canManage} />}
    {section === 'Incidents' && <IncidentsPage revision={revision} onSelect={setSelected} onNewIncident={() => setCreating(true)} canManage={canManage} />}
    {section === 'Security Events' && <SecurityEventsPage events={events} incidents={incidents} loading={loading} error={error} onRetry={loadData} onCreated={upsertSecurityEvent} onLinked={upsertSecurityEvent} canManage={canManage} />}
    {section === 'Analytics' && <AnalyticsPage incidents={incidents} events={events} loading={loading} error={error} onRetry={loadData} />}
    {section === 'Users' && session.user.role === UserRole.Admin && <UsersPage />}
    {canManage && creating && <IncidentForm onClose={() => setCreating(false)} onCreated={(item) => { upsertIncident(item); setRevision((value) => value + 1) }} />}
    {selected && <IncidentDetail incident={selected} onClose={() => setSelected(null)} onChanged={(item) => { upsertIncident(item); setSelected(item); setRevision((value) => value + 1) }} onArchived={removeIncident} canManage={canManage} canArchive={canArchive} />}
    {toast && <div className="toast" role="status"><span>◉</span>{toast}</div>}
  </Layout>
}
