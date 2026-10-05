import { useEffect, useState } from 'react'
import { getCisaKev } from '../api/threatIntel'
import { ErrorState, LoadingState } from '../components/States'
import type { ThreatIntelResponse } from '../types'

function formatSourceDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function ThreatIntelPage() {
  const [data, setData] = useState<ThreatIntelResponse | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')

      getCisaKev({
        search: search.trim() || undefined,
        limit: 80,
        refresh: refreshKey > 0,
      })
        .then(setData)
        .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load threat intelligence'))
        .finally(() => setLoading(false))
    }, search ? 300 : 0)

    return () => window.clearTimeout(timer)
  }, [search, refreshKey])

  return <>
    <section className="welcome compact">
      <div>
        <span className="eyebrow live-label">LIVE EXTERNAL INTELLIGENCE</span>
        <h2>CISA exploited-vulnerability feed</h2>
        <p>Current vulnerabilities confirmed by CISA as known to be exploited in the wild.</p>
      </div>
      <button className="button ghost" disabled={loading} onClick={() => setRefreshKey((value) => value + 1)}>
        {loading ? 'Refreshing…' : 'Refresh source'}
      </button>
    </section>

    {loading && !data ? <LoadingState /> : error && !data ? <ErrorState message={error} retry={() => setRefreshKey((value) => value + 1)} /> : data && <>
      <section className="threat-source-bar">
        <div><i className="live-source-dot" /><strong>{data.source}</strong><span>Official CISA data via the cisagov KEV mirror</span></div>
        <a href={data.sourceUrl} target="_blank" rel="noreferrer">View CISA source ↗</a>
      </section>

      <section className="stats-grid threat-stats" aria-label="Threat intelligence metrics">
        <article className="stat-card"><span className="stat-icon tone-0">◆</span><div><small>Known exploited</small><strong>{data.totalCount}</strong><span>Current catalog entries</span></div></article>
        <article className="stat-card"><span className="stat-icon tone-1">＋</span><div><small>Added in 30 days</small><strong>{data.addedLast30Days}</strong><span>Recently added KEVs</span></div></article>
        <article className="stat-card"><span className="stat-icon tone-2">!</span><div><small>Ransomware linked</small><strong>{data.knownRansomwareCount}</strong><span>Known campaign use</span></div></article>
        <article className="stat-card"><span className="stat-icon tone-3">↻</span><div><small>Source updated</small><strong className="source-date">{data.latestDateAdded ?? '—'}</strong><span>{formatSourceDate(data.dateReleased)}</span></div></article>
      </section>

      <section className="panel threat-panel">
        <div className="filters">
          <label className="search"><span className="sr-only">Search CISA threat intelligence</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search CVE, vendor, product, or vulnerability…" /></label>
        </div>

        {error && <div className="inline-source-error">{error}</div>}

        <div className="threat-list">
          {data.items.map((item) => <article className="threat-item" key={item.cveId}>
            <div className="threat-item-top">
              <div>
                <a className="cve-link" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.cveId} ↗</a>
                <h3>{item.vulnerabilityName}</h3>
                <p className="threat-product">{item.vendorProject} · {item.product}</p>
              </div>
              <div className="threat-badges">
                <span className="intel-badge">Added {item.dateAdded}</span>
                {item.knownRansomwareCampaignUse === 'Known' && <span className="intel-badge ransomware">Ransomware use</span>}
              </div>
            </div>

            <p className="threat-description">{item.shortDescription}</p>

            <div className="threat-action">
              <span>Required action</span>
              <p>{item.requiredAction}</p>
            </div>

            <footer>
              <span>Due: {item.dueDate || 'Not specified'}</span>
              <span>Source: CISA KEV</span>
            </footer>
          </article>)}

          {!data.items.length && <div className="state-card"><strong>No matching KEV entries</strong><span>Try a different CVE, vendor, or product.</span></div>}
        </div>
      </section>

      <p className="intel-disclaimer">Threat Intel is external intelligence, not proof that one of your monitored devices is vulnerable. Local device detection remains separate from this feed.</p>
    </>}
  </>
}
