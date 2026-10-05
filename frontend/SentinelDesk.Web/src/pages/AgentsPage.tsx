import { useEffect, useState } from 'react'
import { getWindowsCollectorSetup, getWindowsCollectorStatus, type WindowsCollectorSetup, type WindowsCollectorStatus } from '../api/agents'
import { ErrorState, LoadingState } from '../components/States'

function formatDate(value: string | null) {
  if (!value) return 'No Windows events received yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function AgentsPage() {
  const [status, setStatus] = useState<WindowsCollectorStatus | null>(null)
  const [setup, setSetup] = useState<WindowsCollectorSetup | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupLoading, setSetupLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadStatus = () => {
    setLoading(true)
    setError('')
    getWindowsCollectorStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load collector status'))
      .finally(() => setLoading(false))
  }

  useEffect(loadStatus, [])

  const revealSetup = async () => {
    setSetupLoading(true)
    setError('')
    try {
      setSetup(await getWindowsCollectorSetup())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to retrieve collector setup')
    } finally {
      setSetupLoading(false)
    }
  }

  const command = setup
    ? `$p="$env:TEMP\\SentinelDeskAgent.ps1"; Invoke-WebRequest "${setup.scriptUrl}" -OutFile $p; Unblock-File $p; & $p -ApiUrl "${setup.apiUrl}" -ApiKey "${setup.apiKey}" -EnableAudit`
    : ''

  const copyCommand = async () => {
    if (!command) return
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  if (loading) return <LoadingState />
  if (error && !status) return <ErrorState message={error} retry={loadStatus} />

  return <>
    <section className="welcome compact">
      <div>
        <span className="eyebrow live-label">REAL ENDPOINT TELEMETRY</span>
        <h2>Windows collector</h2>
        <p>Connect a real Windows machine to SentinelDesk using Windows Event Logs.</p>
      </div>
      <button className="button ghost" onClick={loadStatus}>Refresh status</button>
    </section>

    <section className="collector-grid">
      <article className="panel collector-status">
        <div className="panel-head"><span className="eyebrow">COLLECTOR STATUS</span><h3>Production ingestion</h3></div>
        <div className="collector-status-body">
          <div><span>Ingestion API</span><strong className={status?.configured ? 'collector-ok' : 'collector-bad'}>{status?.configured ? 'Configured' : 'Not configured'}</strong></div>
          <div><span>Events received (24h)</span><strong>{status?.eventsLast24Hours ?? 0}</strong></div>
          <div><span>Last Windows event</span><strong>{formatDate(status?.lastEventAt ?? null)}</strong></div>
        </div>
      </article>

      <article className="panel collector-sources">
        <div className="panel-head"><span className="eyebrow">MONITORED SOURCES</span><h3>Windows Event Logs</h3></div>
        <div className="collector-source-list">
          <div><code>4625</code><span><strong>Failed logon</strong><small>Windows Security log</small></span></div>
          <div><code>4688</code><span><strong>Process creation</strong><small>Windows Security log</small></span></div>
          <div><code>4104</code><span><strong>PowerShell script block</strong><small>PowerShell Operational log</small></span></div>
        </div>
      </article>
    </section>

    <section className="panel collector-setup">
      <div className="panel-head"><span className="eyebrow">CONNECT THIS WINDOWS PC</span><h3>Collector setup</h3></div>
      <div className="collector-setup-body">
        <p>Run PowerShell <strong>as Administrator</strong>. The setup command downloads the collector from your GitHub repository, enables the required Windows audit sources, then starts sending real event records to SentinelDesk.</p>

        {!setup ? <button className="button primary" disabled={setupLoading} onClick={revealSetup}>{setupLoading ? 'Preparing…' : 'Reveal secure setup command'}</button> : <>
          <div className="setup-warning"><strong>Keep this command private.</strong><span>It contains the ingestion key for your SentinelDesk workspace.</span></div>
          <pre className="setup-command"><code>{command}</code></pre>
          <div className="collector-actions">
            <button className="button primary" onClick={copyCommand}>{copied ? 'Copied' : 'Copy PowerShell command'}</button>
            <a className="button ghost link-button" href={setup.scriptUrl} target="_blank" rel="noreferrer">View collector script ↗</a>
          </div>
        </>}
      </div>
    </section>

    <section className="panel collector-how">
      <div className="panel-head"><span className="eyebrow">LIVE TEST</span><h3>How to prove it is real</h3></div>
      <ol>
        <li>Keep SentinelDesk open on <strong>Security Events</strong> in one browser tab.</li>
        <li>Run the collector command above in an Administrator PowerShell window.</li>
        <li>Generate normal Windows activity. Failed logons, process creation, and PowerShell script-block events will come from Windows itself.</li>
        <li>Watch the event appear in SentinelDesk without manually creating it.</li>
      </ol>
    </section>

    {error && <div className="test-result error"><strong>Collector error</strong><span>{error}</span></div>}
  </>
}
