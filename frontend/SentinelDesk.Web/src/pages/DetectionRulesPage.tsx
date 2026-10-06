import { useEffect, useState } from 'react'
import { Save, ShieldCheck } from 'lucide-react'
import { getDetectionRules, updateDetectionRule } from '../api/detectionRules'
import { ErrorState, LoadingState } from '../components/States'
import { IncidentSeverity, type DetectionRule } from '../types'

export function DetectionRulesPage() {
  const [rules, setRules] = useState<DetectionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setRules(await getDetectionRules())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load detection rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const patch = (id: string, values: Partial<DetectionRule>) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...values } : rule))
  }

  const save = async (rule: DetectionRule) => {
    setSavingId(rule.id)
    setSavedId(null)
    setError('')
    try {
      const updated = await updateDetectionRule(rule.id, {
        isEnabled: rule.isEnabled,
        severity: rule.severity,
        triggerCount: rule.triggerCount,
        windowMinutes: rule.windowMinutes,
        riskScore: rule.riskScore,
        matchPatterns: rule.matchPatterns,
      })
      patch(rule.id, updated)
      setSavedId(rule.id)
      window.setTimeout(() => setSavedId((current) => current === rule.id ? null : current), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save rule')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <LoadingState />
  if (error && !rules.length) return <ErrorState message={error} retry={() => void load()} />

  return <>
    <section className="welcome compact">
      <div>
        <span className="eyebrow live-label">DETECTION ENGINE</span>
        <h2>Detection rules</h2>
        <p>Configure how real Windows telemetry becomes high-risk events and incidents.</p>
      </div>
    </section>

    <div className="mb-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs leading-6 text-slate-400">
      Changes affect <strong className="text-slate-200">future incoming telemetry</strong>. Raw Windows events are still collected when an incident rule is disabled.
    </div>

    <section className="grid gap-4 xl:grid-cols-2">
      {rules.map((rule) => <article key={rule.id} className="panel">
        <div className="panel-head flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${rule.isEnabled ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-600'}`}>
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <span className="eyebrow">{rule.ruleKey}</span>
              <h3>{rule.name}</h3>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">{rule.description}</p>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-500">
            <input type="checkbox" className="h-4 w-4 accent-cyan-300" checked={rule.isEnabled} onChange={(event) => patch(rule.id, { isEnabled: event.target.checked })} />
            Enabled
          </label>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Severity
              <select value={rule.severity} onChange={(event) => patch(rule.id, { severity: event.target.value as IncidentSeverity })}>
                {Object.values(IncidentSeverity).map((severity) => <option key={severity}>{severity}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Trigger count
              <input type="number" min={1} max={1000} value={rule.triggerCount} onChange={(event) => patch(rule.id, { triggerCount: Number(event.target.value) })} />
            </label>
            <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Risk score
              <input type="number" min={0} max={100} value={rule.riskScore} onChange={(event) => patch(rule.id, { riskScore: Number(event.target.value) })} />
            </label>
          </div>

          <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Correlation window (minutes)
            <input type="number" min={1} max={1440} value={rule.windowMinutes} onChange={(event) => patch(rule.id, { windowMinutes: Number(event.target.value) })} />
          </label>

          {rule.ruleKey !== 'failed-logon-burst' && <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Match patterns <span className="font-normal normal-case tracking-normal text-slate-600">one pattern per line</span>
            <textarea rows={7} value={rule.matchPatterns} onChange={(event) => patch(rule.id, { matchPatterns: event.target.value })} />
          </label>}

          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <span className="font-mono text-[9px] text-slate-600">Updated {new Date(rule.updatedAt).toLocaleString()}</span>
            <button className="button primary small" onClick={() => void save(rule)} disabled={savingId === rule.id}>
              <Save className="mr-2 h-3.5 w-3.5" />
              {savingId === rule.id ? 'Saving…' : savedId === rule.id ? 'Saved' : 'Save rule'}
            </button>
          </div>
        </div>
      </article>)}
    </section>

    {error && <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
  </>
}
