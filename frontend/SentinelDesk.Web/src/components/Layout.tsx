import type { ConnectionState } from '../types'

export type Section = 'Dashboard' | 'Incidents' | 'Security Events' | 'Analytics' | 'Settings'

const nav: Array<{ name: Section; icon: string }> = [
  { name: 'Dashboard', icon: '⌁' }, { name: 'Incidents', icon: '△' },
  { name: 'Security Events', icon: '◎' }, { name: 'Analytics', icon: '⌗' }, { name: 'Settings', icon: '⚙' },
]

export function Layout({ section, onNavigate, connection, children }: {
  section: Section; onNavigate: (section: Section) => void; connection: ConnectionState; children: React.ReactNode
}) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark"><span className="brand-shield">S</span><div><strong>SentinelDesk</strong><small>SECURITY OPERATIONS</small></div></div>
      <nav aria-label="Primary navigation">
        {nav.map((item) => <button key={item.name} className={section === item.name ? 'active' : ''} onClick={() => onNavigate(item.name)}>
          <span aria-hidden="true">{item.icon}</span>{item.name}{item.name === 'Security Events' && <i className="live-dot" />}
        </button>)}
      </nav>
      <div className="sidebar-footer"><span className="avatar">SO</span><div><strong>SOC Operator</strong><small>Analyst workspace</small></div></div>
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
