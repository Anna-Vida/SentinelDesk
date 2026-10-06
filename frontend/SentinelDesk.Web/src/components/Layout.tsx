import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  Bell,
  ChevronRight,
  Clock3,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { UserRole, type AuthUser, type ConnectionState, type Incident, type SecurityEvent } from '../types'

export type Section = 'Dashboard' | 'Incidents' | 'Security Events' | 'Threat Intel' | 'Analytics' | 'Windows Agent' | 'Users'

type NavItem = {
  name: Section
  icon: LucideIcon
  badge?: string
}

const monitoringNav: NavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Incidents', icon: ShieldAlert },
  { name: 'Security Events', icon: RadioTower, badge: 'LIVE' },
  { name: 'Threat Intel', icon: Shield, badge: 'CISA' },
  { name: 'Analytics', icon: BarChart3 },
]

const administrationNav: NavItem[] = [
  { name: 'Windows Agent', icon: MonitorCog },
  { name: 'Users', icon: Users },
]

function formatTelemetryTime(value?: string) {
  if (!value) return 'No telemetry yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function relativeTelemetryTime(value?: string) {
  if (!value) return 'No telemetry received'
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return 'Telemetry time unavailable'

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function Layout({
  section,
  onNavigate,
  connection,
  user,
  onLogout,
  incidents,
  events,
  canManage,
  onNewIncident,
  onRefresh,
  children,
}: {
  section: Section
  onNavigate: (section: Section) => void
  connection: ConnectionState
  user: AuthUser
  onLogout: () => void
  incidents: Incident[]
  events: SecurityEvent[]
  canManage: boolean
  onNewIncident: () => void
  onRefresh: () => void
  children: ReactNode
}) {
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')

  const initials = user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'SO'

  const activeIncidents = incidents.filter((incident) => !incident.isArchived && incident.status !== 'Closed')
  const highRiskEvents = events.filter((event) => event.riskScore >= 70)
  const latestEvent = events[0]
  const eventsLast24Hours = events.filter((event) => Date.parse(event.detectedAt) >= Date.now() - 86_400_000)

  const allowedNav = useMemo(
    () => user.role === UserRole.Admin ? [...monitoringNav, ...administrationNav] : monitoringNav,
    [user.role],
  )

  const commandItems = useMemo(() => {
    const term = commandQuery.trim().toLowerCase()
    return term
      ? allowedNav.filter((item) => item.name.toLowerCase().includes(term))
      : allowedNav
  }, [allowedNav, commandQuery])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((current) => !current)
      }

      if (event.key === 'Escape') {
        setCommandOpen(false)
        setActivityOpen(false)
        setMobileOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filterNav = (items: NavItem[]) => {
    const term = query.trim().toLowerCase()
    return term ? items.filter((item) => item.name.toLowerCase().includes(term)) : items
  }

  const navigate = (next: Section) => {
    onNavigate(next)
    setMobileOpen(false)
    setCommandOpen(false)
    setCommandQuery('')
  }

  const navCount = (name: Section) => {
    if (name === 'Incidents') return activeIncidents.length
    if (name === 'Security Events') return eventsLast24Hours.length
    return null
  }

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const active = section === item.name
    const count = navCount(item.name)

    return <button
      key={item.name}
      onClick={() => navigate(item.name)}
      className={[
        'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-150',
        active
          ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[inset_3px_0_0_#2dd4bf]'
          : 'border-transparent text-slate-400 hover:border-slate-700/80 hover:bg-slate-800/60 hover:text-slate-100',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <span className={[
        'grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors',
        active
          ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-300'
          : 'border-slate-700/70 bg-slate-900/70 text-slate-500 group-hover:text-cyan-300',
      ].join(' ')}>
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>

      {count !== null && <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-0.5 font-mono text-[9px] text-slate-400">
        {count > 99 ? '99+' : count}
      </span>}

      {item.badge && <span className={[
        'rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wider',
        item.badge === 'LIVE'
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
          : 'border-slate-600/70 bg-slate-900/70 text-slate-400',
      ].join(' ')}>{item.badge}</span>}
      {active && <ChevronRight className="h-3.5 w-3.5 text-cyan-300/70" />}
    </button>
  }

  const connectionDot = connection === 'Connected'
    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.75)]'
    : connection === 'Reconnecting'
      ? 'bg-amber-400'
      : 'bg-rose-400'

  const sidebar = <aside className="flex h-full w-full flex-col bg-[#071522]">
    <div className="flex h-[76px] items-center justify-between border-b border-slate-800/80 px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300 text-base font-black text-slate-950 shadow-[0_8px_24px_rgba(45,212,191,.16)]">
          S
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-[15px] font-semibold tracking-tight text-slate-100">SentinelDesk</strong>
          <span className="mt-0.5 block font-mono text-[9px] tracking-[0.2em] text-slate-500">SECURITY OPERATIONS</span>
        </div>
      </div>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-700/80 bg-slate-900/50" title={connection}>
        <span className={`h-2 w-2 rounded-full ${connectionDot}`} />
      </div>
    </div>

    <div className="px-4 pt-4">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search navigation..."
          className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/40 pl-9 pr-9 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
        />
        {query && <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-600 hover:bg-slate-800 hover:text-slate-300"
          aria-label="Clear navigation search"
        >
          <X className="h-3.5 w-3.5" />
        </button>}
      </label>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
      <nav aria-label="Primary navigation" className="space-y-6">
        <section>
          <p className="mb-2 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Monitoring</p>
          <div className="space-y-1">{filterNav(monitoringNav).map(renderItem)}</div>
        </section>

        {user.role === UserRole.Admin && <section>
          <p className="mb-2 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Administration</p>
          <div className="space-y-1">{filterNav(administrationNav).map(renderItem)}</div>
        </section>}
      </nav>

      <button
        type="button"
        onClick={() => setActivityOpen(true)}
        className="mt-6 w-full rounded-xl border border-cyan-300/10 bg-gradient-to-br from-cyan-300/[0.07] via-slate-900/60 to-slate-950/70 p-4 text-left transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.08]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-300" />
            <strong className="text-xs font-semibold text-slate-200">Live workspace</strong>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2 py-0.5 font-mono text-[8px] text-slate-500">VIEW</span>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">{activeIncidents.length} active incidents · {eventsLast24Hours.length} events in 24h</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-[9px] text-emerald-300">
            <span className={`h-1.5 w-1.5 rounded-full ${connectionDot}`} />
            {connection}
          </span>
          <span className="font-mono text-[9px] text-slate-600">{relativeTelemetryTime(latestEvent?.detectedAt)}</span>
        </div>
      </button>
    </div>

    <div className="border-t border-slate-800/80 bg-slate-950/20 p-3">
      <div className="flex items-center gap-3 rounded-xl p-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] font-mono text-[10px] font-semibold text-cyan-300">{initials}</div>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-xs font-semibold text-slate-200">{user.displayName}</strong>
          <span className="mt-0.5 block truncate text-[10px] text-slate-600">{user.email}</span>
        </div>
        <button
          onClick={onLogout}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-600 transition hover:bg-rose-400/10 hover:text-rose-300"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  </aside>

  return <div className="min-h-screen bg-sd-bg text-slate-200 lg:pl-72">
    {mobileOpen && <button
      className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm lg:hidden"
      onClick={() => setMobileOpen(false)}
      aria-label="Close navigation"
    />}

    <div className={[
      'fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-800/80 transition-transform duration-200 lg:translate-x-0',
      mobileOpen ? 'translate-x-0' : '-translate-x-full',
    ].join(' ')}>
      {sidebar}
    </div>

    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-800/80 bg-sd-bg/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <span className="hidden font-mono text-[9px] tracking-[0.16em] text-slate-600 sm:inline">SENTINELDESK / </span>
            <h1 className="inline truncate text-sm font-semibold text-slate-100">{section}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/35 px-3 py-2 text-[10px] text-slate-500 md:flex">
            <Clock3 className="h-3.5 w-3.5 text-slate-600" />
            <span>Latest telemetry</span>
            <strong className="font-mono font-medium text-slate-300">{formatTelemetryTime(latestEvent?.detectedAt)}</strong>
          </div>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/45 px-3 text-[10px] text-slate-500 transition hover:border-slate-700 hover:text-slate-300 sm:flex"
            title="Command palette"
          >
            <Command className="h-3.5 w-3.5" />
            <span>Quick nav</span>
            <kbd className="rounded border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 font-mono text-[8px] text-slate-600">Ctrl K</kbd>
          </button>

          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-800 bg-slate-900/45 text-slate-500 transition hover:border-slate-700 hover:text-slate-200"
            aria-label="Open recent activity"
          >
            <Bell className="h-4 w-4" />
            {eventsLast24Hours.length > 0 && <span className="absolute -right-1 -top-1 min-w-[17px] rounded-full border border-[#07111f] bg-cyan-300 px-1 text-center font-mono text-[8px] font-bold leading-4 text-slate-950">
              {eventsLast24Hours.length > 99 ? '99+' : eventsLast24Hours.length}
            </span>}
          </button>

          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/45 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${connectionDot}`} />
            <span className="hidden sm:inline">{connection}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>

    {activityOpen && <>
      <button
        className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-[2px]"
        onClick={() => setActivityOpen(false)}
        aria-label="Close recent activity"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-800 bg-[#081522] shadow-2xl">
        <div className="flex h-[72px] items-center justify-between border-b border-slate-800 px-5">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300">Live feed</span>
            <h2 className="mt-1 text-base font-semibold text-slate-100">Recent activity</h2>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200" onClick={() => setActivityOpen(false)} aria-label="Close activity">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-slate-800 p-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/25 p-3">
            <span className="font-mono text-[8px] uppercase text-slate-600">Incidents</span>
            <strong className="mt-1 block font-mono text-lg text-slate-100">{activeIncidents.length}</strong>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/25 p-3">
            <span className="font-mono text-[8px] uppercase text-slate-600">24h events</span>
            <strong className="mt-1 block font-mono text-lg text-slate-100">{eventsLast24Hours.length}</strong>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/25 p-3">
            <span className="font-mono text-[8px] uppercase text-slate-600">High risk</span>
            <strong className="mt-1 block font-mono text-lg text-rose-300">{highRiskEvents.length}</strong>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">Latest telemetry</span>
            <button onClick={onRefresh} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-cyan-300">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          <div className="space-y-2">
            {events.slice(0, 12).map((event) => <button
              key={event.id}
              onClick={() => {
                navigate('Security Events')
                setActivityOpen(false)
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/20 p-3 text-left transition hover:border-slate-700 hover:bg-slate-900/60"
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-xs font-semibold text-slate-200">{event.eventType}</strong>
                <span className={[
                  'rounded-full border px-2 py-0.5 font-mono text-[8px]',
                  event.riskScore >= 80
                    ? 'border-rose-400/25 bg-rose-400/10 text-rose-300'
                    : event.riskScore >= 60
                      ? 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                      : 'border-slate-700 bg-slate-900 text-slate-500',
                ].join(' ')}>RISK {event.riskScore}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">{event.description}</p>
              <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[9px] text-slate-600">
                <span className="truncate">{event.sourceIp}</span>
                <span>{relativeTelemetryTime(event.detectedAt)}</span>
              </div>
            </button>)}

            {!events.length && <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-600">No telemetry has been received yet.</div>}
          </div>
        </div>
      </aside>
    </>}

    {commandOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/75 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setCommandOpen(false)}>
      <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0a1828] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-800 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-600" />
          <input
            autoFocus
            value={commandQuery}
            onChange={(event) => setCommandQuery(event.target.value)}
            placeholder="Go to a SentinelDesk page..."
            className="h-14 border-0 bg-transparent px-0 text-sm focus:ring-0"
          />
          <kbd className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[9px] text-slate-600">ESC</kbd>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          <p className="px-3 pb-2 pt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">Navigation</p>
          {commandItems.map((item) => {
            const Icon = item.icon
            return <button
              key={item.name}
              onClick={() => navigate(item.name)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-100"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-800 bg-slate-950/50 text-cyan-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.name}</span>
              <ChevronRight className="h-4 w-4 text-slate-700" />
            </button>
          })}

          {canManage && !commandQuery && <>
            <div className="my-2 border-t border-slate-800" />
            <p className="px-3 pb-2 pt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-slate-600">Quick action</p>
            <button
              onClick={() => {
                onNewIncident()
                setCommandOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 transition hover:bg-cyan-300/10 hover:text-cyan-200"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
                <Plus className="h-4 w-4" />
              </span>
              <span className="flex-1">Create new incident</span>
              <span className="font-mono text-[9px] text-slate-600">ACTION</span>
            </button>
          </>}

          {!commandItems.length && <div className="px-4 py-10 text-center text-xs text-slate-600">No matching SentinelDesk page.</div>}
        </div>
      </section>
    </div>}
  </div>
}
