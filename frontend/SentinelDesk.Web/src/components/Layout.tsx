import { UserRole, type AuthUser, type ConnectionState } from '../types'

export type Section = 'Dashboard' | 'Incidents' | 'Security Events' | 'Analytics' | 'Live Test' | 'Users'

const baseNav: Array<{ name: Section; icon: string }> = [
  { name: 'Dashboard', icon: '⌁' },
  { name: 'Incidents', icon: '△' },
  { name: 'Security Events', icon: '◎' },
  { name: 'Analytics', icon: '⌗' },
]

export function Layout({ section, onNavigate, connection, user, onLogout, children }: {
  section: Section
  onNavigate: (section: Section) => void
  connection: ConnectionState
  user: AuthUser
  onLogout: () => void
  children: React.ReactNode
}) {
  const initials = user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SO'
  const operationalNav = user.role === UserRole.Viewer
    ? baseNav
    : [...baseNav, { name: 'Live Test' as const, icon: '◈' }]
  const nav = user.role === UserRole.Admin
    ? [...operationalNav, { name: 'Users' as const, icon: '◇' }]
    : operationalNav

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark"><span className="brand-shield">S</span><div><strong>SentinelDesk</strong><small>SECURITY OPERATIONS</small></div></div>
      <nav aria-label="Primary navigation">{nav.map((item) => <button key={item.name} className={section === item.name ? 'active' : ''} aria-current={section === item.name ? 'page' : undefined} onClick={() => onNavigate(item.name)}><span aria-hidden="true">{item.icon}</span>{item.name}{item.name === 'Security Events' && <i className="live-dot" />}</button>)}</nav>
      <div className="sidebar-footer user-footer"><span className="avatar">{initials}</span><div className="user-meta"><strong>{user.displayName}</strong><small>{user.role}</small></div><button className="logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out">↗</button></div>
    </aside>
    <div className="main-column"><header className="topbar"><div><span className="eyebrow">SENTINELDESK /</span><h1>{section}</h1></div><div className={`connection ${connection.toLowerCase()}`} role="status"><i />{connection}</div></header><main>{children}</main></div>
  </div>
}
