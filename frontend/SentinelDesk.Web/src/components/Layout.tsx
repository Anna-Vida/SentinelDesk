import { useState, type ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  RadioTower,
  Search,
  Shield,
  ShieldAlert,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { UserRole, type AuthUser, type ConnectionState } from '../types'

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

export function Layout({ section, onNavigate, connection, user, onLogout, children }: {
  section: Section
  onNavigate: (section: Section) => void
  connection: ConnectionState
  user: AuthUser
  onLogout: () => void
  children: ReactNode
}) {
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const initials = user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'SO'

  const filterNav = (items: NavItem[]) => {
    const term = query.trim().toLowerCase()
    return term ? items.filter((item) => item.name.toLowerCase().includes(term)) : items
  }

  const navigate = (next: Section) => {
    onNavigate(next)
    setMobileOpen(false)
  }

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const active = section === item.name

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

      <div className="mt-6 rounded-xl border border-cyan-300/10 bg-gradient-to-br from-cyan-300/[0.07] via-slate-900/60 to-slate-950/70 p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" />
          <strong className="text-xs font-semibold text-slate-200">Live workspace</strong>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">Realtime endpoint telemetry and response workflows are active.</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-[9px] text-emerald-300">
            <span className={`h-1.5 w-1.5 rounded-full ${connectionDot}`} />
            {connection}
          </span>
          <span className="rounded-md border border-slate-700 px-1.5 py-1 font-mono text-[8px] uppercase tracking-wider text-slate-500">{user.role}</span>
        </div>
      </div>
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
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/45 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${connectionDot}`} />
          <span className="hidden sm:inline">{connection}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  </div>
}
