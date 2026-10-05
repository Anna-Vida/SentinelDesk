import { useMemo, useState } from 'react'
import { UserRole, type AuthUser, type ConnectionState } from '../types'

export type Section = 'Dashboard' | 'Incidents' | 'Security Events' | 'Threat Intel' | 'Analytics' | 'Windows Agent' | 'Users'

type NavItem = {
  name: Section
  icon: string
  badge?: string
}

const monitoringNav: NavItem[] = [
  { name: 'Dashboard', icon: '⌂' },
  { name: 'Incidents', icon: '△' },
  { name: 'Security Events', icon: '◎', badge: 'LIVE' },
  { name: 'Threat Intel', icon: '◆', badge: 'CISA' },
  { name: 'Analytics', icon: '⌗' },
]

const administrationNav: NavItem[] = [
  { name: 'Windows Agent', icon: '▣' },
  { name: 'Users', icon: '◇' },
]

export function Layout({ section, onNavigate, connection, user, onLogout, children }: {
  section: Section
  onNavigate: (section: Section) => void
  connection: ConnectionState
  user: AuthUser
  onLogout: () => void
  children: React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const initials = user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'SO'

  const filterItems = (items: NavItem[]) => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => item.name.toLowerCase().includes(term))
  }

  const visibleMonitoring = useMemo(() => filterItems(monitoringNav), [query])
  const visibleAdministration = useMemo(
    () => user.role === UserRole.Admin ? filterItems(administrationNav) : [],
    [query, user.role],
  )

  const renderItem = (item: NavItem) => {
    const active = section === item.name
    return <button
      key={item.name}
      className={active ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
      aria-current={active ? 'page' : undefined}
      onClick={() => onNavigate(item.name)}
      title={item.name}
    >
      <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
      <span className="sidebar-nav-label">{item.name}</span>
      {item.badge && <span className={item.badge === 'LIVE' ? 'sidebar-nav-badge live' : 'sidebar-nav-badge'}>{item.badge}</span>}
    </button>
  }

  return <div className="app-shell">
    <aside className="sidebar sidebar-pro">
      <div className="sidebar-brand-row">
        <div className="brand-mark">
          <span className="brand-shield">S</span>
          <div>
            <strong>SentinelDesk</strong>
            <small>SECURITY OPERATIONS</small>
          </div>
        </div>
        <span className="sidebar-brand-status" title={connection} aria-label={`Realtime status: ${connection}`}>
          <i className={connection.toLowerCase()} />
        </span>
      </div>

      <label className="sidebar-search">
        <span aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search navigation..."
          aria-label="Search navigation"
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear navigation search">×</button>}
      </label>

      <div className="sidebar-scroll">
        <nav className="sidebar-nav" aria-label="Primary navigation">
          <section className="sidebar-nav-group">
            <span className="sidebar-group-label">Monitoring</span>
            <div className="sidebar-nav-list">
              {visibleMonitoring.map(renderItem)}
              {!visibleMonitoring.length && <span className="sidebar-empty-search">No monitoring pages match.</span>}
            </div>
          </section>

          {user.role === UserRole.Admin && <section className="sidebar-nav-group">
            <span className="sidebar-group-label">Administration</span>
            <div className="sidebar-nav-list">
              {visibleAdministration.map(renderItem)}
              {!visibleAdministration.length && <span className="sidebar-empty-search">No admin pages match.</span>}
            </div>
          </section>
        </nav>

        <div className="sidebar-live-card">
          <div className="sidebar-live-card-head">
            <span className="sidebar-live-pulse" />
            <strong>Live workspace</strong>
          </div>
          <p>Realtime SOC telemetry and response workflows are active.</p>
          <div className="sidebar-live-card-status">
            <span>{connection === 'Connected' ? 'SignalR connected' : connection}</span>
            <strong>{user.role}</strong>
          </div>
        </div>
      </div>

      <div className="sidebar-footer sidebar-account">
        <span className="avatar">{initials}</span>
        <div className="user-meta">
          <strong>{user.displayName}</strong>
          <small>{user.email || user.role}</small>
          <span className="sidebar-role">{user.role}</span>
        </div>
        <button className="logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out">↗</button>
      </div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <div><span className="eyebrow">SENTINELDESK /</span><h1>{section}</h1></div>
        <div className={`connection ${connection.toLowerCase()}`} role="status"><i />{connection}</div>
      </header>
      <main>{children}</main>
    </div>
  </div>
}
