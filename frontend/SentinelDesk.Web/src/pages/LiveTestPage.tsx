import { useEffect, useState } from 'react'
import { clearTestData, getTestLabStatus, runTestScenario } from '../api/testLab'
import type { ConnectionState, TestLabStatus, TestScenarioName, TestScenarioResult } from '../types'

const scenarios: Array<{
  id: TestScenarioName
  title: string
  severity: string
  description: string
  icon: string
}> = [
  {
    id: 'phishing',
    title: 'Phishing campaign',
    severity: 'High',
    description: 'Creates a credential-phishing incident with suspicious email, DNS, and MFA telemetry.',
    icon: '✉',
  },
  {
    id: 'brute-force',
    title: 'Brute-force attack',
    severity: 'Critical',
    description: 'Creates repeated authentication failures, impossible travel, and a privileged login.',
    icon: '⌁',
  },
  {
    id: 'malware',
    title: 'Malware outbreak',
    severity: 'Critical',
    description: 'Creates endpoint malware, PowerShell execution, and command-and-control telemetry.',
    icon: '!',
  },
]

export function LiveTestPage({ connection, onCompleted, canClear }: {
  connection: ConnectionState
  onCompleted: () => void
  canClear: boolean
}) {
  const [status, setStatus] = useState<TestLabStatus | null>(null)
  const [running, setRunning] = useState<TestScenarioName | null>(null)
  const [result, setResult] = useState<TestScenarioResult | null>(null)
  const [error, setError] = useState('')
  const [clearing, setClearing] = useState(false)
  const [clearMessage, setClearMessage] = useState('')

  const refreshStatus = () => {
    getTestLabStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to check live services'))
  }

  useEffect(refreshStatus, [])

  const run = async (scenario: TestScenarioName) => {
    setRunning(scenario)
    setError('')
    setResult(null)

    try {
      const created = await runTestScenario(scenario)
      setResult(created)
      refreshStatus()
      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run scenario')
    } finally {
      setRunning(null)
    }
  }

  const clear = async () => {
    if (!window.confirm('Remove all [LIVE TEST] incidents and their linked telemetry?')) return

    setClearing(true)
    setError('')
    setClearMessage('')

    try {
      const deleted = await clearTestData()
      setResult(null)
      setClearMessage(`Removed ${deleted.deletedIncidents} test incidents and ${deleted.deletedEvents} test events.`)
      refreshStatus()
      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clear test data')
    } finally {
      setClearing(false)
    }
  }

  return <>
    <section className="welcome compact">
      <div>
        <span className="eyebrow">LIVE VALIDATION</span>
        <h2>Security simulation lab</h2>
        <p>Generate real incidents and telemetry in the production database to verify the complete workflow.</p>
      </div>
      {canClear && <button className="button danger" disabled={clearing || Boolean(running)} onClick={clear}>{clearing ? 'Clearing…' : 'Clear test data'}</button>}
    </section>

    <section className="live-test-health">
      <article className="health-chip">
        <i className={status?.databaseOnline ? 'ok' : 'bad'} />
        <div><small>DATABASE</small><strong>{status?.databaseOnline ? 'Online' : status ? 'Offline' : 'Checking…'}</strong></div>
      </article>
      <article className="health-chip">
        <i className={connection === 'Connected' ? 'ok' : 'warn'} />
        <div><small>SIGNALR</small><strong>{connection}</strong></div>
      </article>
      <article className="health-chip">
        <span>△</span>
        <div><small>ACTIVE INCIDENTS</small><strong>{status?.activeIncidents ?? '—'}</strong></div>
      </article>
      <article className="health-chip">
        <span>◎</span>
        <div><small>SECURITY EVENTS</small><strong>{status?.securityEvents ?? '—'}</strong></div>
      </article>
    </section>

    <div className="test-instructions">
      <strong>How to test real-time:</strong>
      <span>Open SentinelDesk in a second browser tab, keep its Dashboard visible, then run a scenario here. The new incident and events should appear in the other tab without refreshing.</span>
    </div>

    <section className="scenario-grid">
      {scenarios.map((scenario) => <article className="scenario-card" key={scenario.id}>
        <div className="scenario-icon">{scenario.icon}</div>
        <div className="scenario-copy">
          <div className="scenario-title"><h3>{scenario.title}</h3><span className={`scenario-severity ${scenario.severity.toLowerCase()}`}>{scenario.severity}</span></div>
          <p>{scenario.description}</p>
        </div>
        <button className="button primary" disabled={Boolean(running)} onClick={() => run(scenario.id)}>
          {running === scenario.id ? 'Running simulation…' : 'Run live simulation'}
        </button>
      </article>)}
    </section>

    {error && <div className="test-result error"><strong>Simulation failed</strong><span>{error}</span></div>}
    {clearMessage && <div className="test-result neutral"><strong>Test data cleared</strong><span>{clearMessage}</span></div>}
    {result && <div className="test-result success">
      <strong>Live test created successfully</strong>
      <span>{result.incident.title}</span>
      <small>{result.events.length} security events were persisted and broadcast. Open Dashboard, Incidents, and Security Events to inspect them.</small>
    </div>}
  </>
}
