import { useEffect, useMemo, useState } from 'react'
import { Laptop, MonitorCheck, MonitorX, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import { getEndpoints, setEndpointEnabled } from '../api/endpoints'
import { ErrorState, LoadingState } from '../components/States'
import type { EndpointSummary } from '../types'

function relativeTime(value: string | null) {
  if (!value) return 'Never'
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return 'Unknown'

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function EndpointsPage({ revision, isAdmin }: { revision: number; isAdmin: boolean }) {
  const [items, setItems] = useState<EndpointSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      setItems(await getEndpoints())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load endpoints')
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(true), 20_000)
    return () => window.clearInterval(timer)
  }, [revision])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) =>
      item.computerName.toLowerCase().includes(term) ||
      item.osName?.toLowerCase().includes(term) ||
      item.agentVersion?.toLowerCase().includes(term))
  }, [items, query])

  const online = items.filter((item) => item.isOnline).length
  const disabled = items.filter((item) => !item.isEnabled).length
  const highRisk = items.reduce((total, item) => total + item.highRiskEventsLast24Hours, 0)

  const toggle = async (item: EndpointSummary) => {
    setUpdatingId(item.id)
    setError('')
    try {
      const updated = await setEndpointEnabled(item.id, !item.isEnabled)
      setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update endpoint')
    } finally {
      setUpdatingId(null)
    }
  }

  return <>
    <section className="welcome compact">
      <div>
        <span className="eyebrow live-label">ENDPOINT INVENTORY</span>
        <h2>Monitored devices</h2>
        <p>Real Windows machines registered through the SentinelDesk collector and heartbeat service.</p>
      </div>
      <button className="button ghost" onClick={() => void load()} disabled={loading}>
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
      </button>
    </section>

    <section className="stats-grid">
      <article className="stat-card">
        <span className="stat-icon"><Laptop className="h-5 w-5" /></span>
        <div><small>Total endpoints</small><strong>{items.length}</strong><span>Registered Windows devices</span></div>
      </article>
      <article className="stat-card">
        <span className="stat-icon tone-3"><MonitorCheck className="h-5 w-5" /></span>
        <div><small>Online</small><strong>{online}</strong><span>Heartbeat within 3 minutes</span></div>
      </article>
      <article className="stat-card">
        <span className="stat-icon tone-1"><MonitorX className="h-5 w-5" /></span>
        <div><small>Offline / disabled</small><strong>{items.length - online}</strong><span>{disabled} administratively disabled</span></div>
      </article>
      <article className="stat-card">
        <span className="stat-icon tone-2"><ShieldAlert className="h-5 w-5" /></span>
        <div><small>High-risk events</small><strong>{highRisk}</strong><span>Risk 70+ in the last 24h</span></div>
      </article>
    </section>

    <section className="panel">
      <div className="filters">
        <label className="search relative">
          <span className="sr-only">Search endpoints</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search computer, OS, or agent version…" />
        </label>
      </div>

      {loading ? <LoadingState /> : error && !items.length ? <ErrorState message={error} retry={() => void load()} /> : <div className="grid gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((item) => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/20 p-4 transition hover:border-slate-700 hover:bg-slate-900/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={[
                'grid h-10 w-10 shrink-0 place-items-center rounded-xl border',
                item.isOnline ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500',
              ].join(' ')}>
                <Laptop className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="m-0 truncate text-sm font-semibold text-slate-100">{item.computerName}</h3>
                <p className="mt-1 truncate text-[10px] text-slate-500">{item.osName || 'Windows'} {item.osVersion || ''}</p>
              </div>
            </div>
            <span className={[
              'rounded-full border px-2 py-1 font-mono text-[8px] uppercase tracking-wider',
              !item.isEnabled
                ? 'border-rose-400/25 bg-rose-400/10 text-rose-300'
                : item.isOnline
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-500',
            ].join(' ')}>
              {!item.isEnabled ? 'Disabled' : item.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2.5"><span className="block font-mono text-[8px] uppercase text-slate-600">24h events</span><strong className="mt-1 block font-mono text-sm text-slate-200">{item.eventsLast24Hours}</strong></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2.5"><span className="block font-mono text-[8px] uppercase text-slate-600">High risk</span><strong className="mt-1 block font-mono text-sm text-rose-300">{item.highRiskEventsLast24Hours}</strong></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2.5"><span className="block font-mono text-[8px] uppercase text-slate-600">Incidents</span><strong className="mt-1 block font-mono text-sm text-slate-200">{item.openIncidents}</strong></div>
          </div>

          <dl className="mt-4 grid gap-2 text-[10px]">
            <div className="flex justify-between gap-3"><dt className="text-slate-600">Last heartbeat</dt><dd className="m-0 font-mono text-slate-400">{relativeTime(item.lastSeenAt)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-600">Last event</dt><dd className="m-0 font-mono text-slate-400">{relativeTime(item.lastEventAt)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-600">Agent</dt><dd className="m-0 font-mono text-slate-400">{item.agentVersion || 'Unknown'}</dd></div>
          </dl>

          {isAdmin && <div className="mt-4 border-t border-slate-800 pt-3">
            <button className={item.isEnabled ? 'button danger small' : 'button primary small'} disabled={updatingId === item.id} onClick={() => void toggle(item)}>
              {updatingId === item.id ? 'Updating…' : item.isEnabled ? 'Disable endpoint' : 'Enable endpoint'}
            </button>
          </div>}
        </article>)}

        {!filtered.length && <div className="state-card lg:col-span-2 2xl:col-span-3">
          <Laptop className="h-7 w-7 text-slate-700" />
          <strong>{items.length ? 'No endpoints match your search.' : 'No endpoints registered yet.'}</strong>
          <span>Run the Windows collector to register the first monitored device.</span>
        </div>}
      </div>}

      {error && items.length > 0 && <div className="inline-source-error">{error}</div>}
    </section>
  </>
}
