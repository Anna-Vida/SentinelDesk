import { useEffect, useState, type FormEvent } from 'react'
import { Clock3, MessageSquareText, UserRound } from 'lucide-react'
import {
  addIncidentNote,
  archiveIncident,
  assignIncident,
  changeIncidentStatus,
  getIncidentAssignees,
  getIncidentTimeline,
  updateIncident,
} from '../api/incidents'
import {
  IncidentSeverity,
  IncidentStatus,
  type Incident,
  type IncidentActivity,
  type IncidentAssignee,
} from '../types'
import { formatDate, shortId } from '../utils/format'
import { SeverityBadge, StatusBadge } from './Badges'

const nextStatus: Partial<Record<IncidentStatus, IncidentStatus>> = {
  [IncidentStatus.Open]: IncidentStatus.Investigating,
  [IncidentStatus.Investigating]: IncidentStatus.Contained,
  [IncidentStatus.Contained]: IncidentStatus.Resolved,
  [IncidentStatus.Resolved]: IncidentStatus.Closed,
}

function activityTone(type: string) {
  if (type === 'Note') return 'border-sky-400/25 bg-sky-400/10 text-sky-300'
  if (type === 'StatusChanged') return 'border-amber-400/25 bg-amber-400/10 text-amber-300'
  if (type === 'AssignmentChanged') return 'border-violet-400/25 bg-violet-400/10 text-violet-300'
  if (type === 'Detection') return 'border-rose-400/25 bg-rose-400/10 text-rose-300'
  return 'border-slate-700 bg-slate-900 text-slate-400'
}

export function IncidentDetail({ incident, onClose, onChanged, onArchived, canManage, canArchive }: {
  incident: Incident
  onClose: () => void
  onChanged: (incident: Incident) => void
  onArchived: (id: string) => void
  canManage: boolean
  canArchive: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(incident.title)
  const [description, setDescription] = useState(incident.description)
  const [severity, setSeverity] = useState(incident.severity)
  const [timeline, setTimeline] = useState<IncidentActivity[]>([])
  const [assignees, setAssignees] = useState<IncidentAssignee[]>([])
  const [note, setNote] = useState('')
  const [timelineLoading, setTimelineLoading] = useState(true)
  const next = nextStatus[incident.status]

  const loadTimeline = async () => {
    setTimelineLoading(true)
    try {
      setTimeline(await getIncidentTimeline(incident.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load timeline')
    } finally {
      setTimelineLoading(false)
    }
  }

  useEffect(() => {
    void loadTimeline()
    if (canManage) {
      getIncidentAssignees()
        .then(setAssignees)
        .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load assignees'))
    }
  }, [incident.id, canManage])

  const beginEdit = () => {
    setTitle(incident.title)
    setDescription(incident.description)
    setSeverity(incident.severity)
    setError('')
    setEditing(true)
  }

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const updated = await updateIncident(incident.id, { title, description, severity })
      onChanged(updated)
      setEditing(false)
      await loadTimeline()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save incident')
    } finally {
      setBusy(false)
    }
  }

  const transition = async () => {
    if (!next) return
    setBusy(true)
    setError('')
    try {
      onChanged(await changeIncidentStatus(incident.id, next))
      await loadTimeline()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const changeAssignment = async (userId: string) => {
    setBusy(true)
    setError('')
    try {
      onChanged(await assignIncident(incident.id, userId || null))
      await loadTimeline()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed')
    } finally {
      setBusy(false)
    }
  }

  const submitNote = async (event: FormEvent) => {
    event.preventDefault()
    const message = note.trim()
    if (!message) return

    setBusy(true)
    setError('')
    try {
      const created = await addIncidentNote(incident.id, message)
      setTimeline((current) => [created, ...current])
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add note')
    } finally {
      setBusy(false)
    }
  }

  const archive = async () => {
    if (!window.confirm('Archive this incident? It will leave active views.')) return
    setBusy(true)
    setError('')
    try {
      await archiveIncident(incident.id)
      onArchived(incident.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal detail-modal max-w-4xl" role="dialog" aria-modal="true" aria-labelledby="incident-title">
      <div className="modal-head">
        <div><span className="eyebrow">INCIDENT #{shortId(incident.id)}</span><h2 id="incident-title">{incident.title}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
      </div>

      {editing ? <form className="incident-edit-form" onSubmit={saveEdit}>
        <label>Title
          <input autoFocus required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>Description
          <textarea required maxLength={4000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>Severity
          <select value={severity} onChange={(event) => setSeverity(event.target.value as IncidentSeverity)}>
            {Object.values(IncidentSeverity).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button ghost" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          <button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <div>
          <div className="detail-badges"><SeverityBadge value={incident.severity} /><StatusBadge value={incident.status} /></div>
          <p className="description">{incident.description}</p>

          <dl className="detail-grid">
            <div><dt>Created</dt><dd>{formatDate(incident.createdAt)}</dd></div>
            <div><dt>Last updated</dt><dd>{formatDate(incident.updatedAt)}</dd></div>
            <div><dt>Assigned to</dt><dd>{incident.assignedToDisplayName || 'Unassigned'}</dd></div>
            <div><dt>Source</dt><dd>{incident.endpointId ? 'Windows endpoint detection' : 'Workspace incident'}</dd></div>
          </dl>

          {canManage && <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-cyan-300" />
              <strong className="text-xs text-slate-200">Incident owner</strong>
            </div>
            <select disabled={busy} value={incident.assignedToUserId || ''} onChange={(event) => void changeAssignment(event.target.value)}>
              <option value="">Unassigned</option>
              {assignees.map((user) => <option value={user.id} key={user.id}>{user.displayName} · {user.role}</option>)}
            </select>
          </section>}

          {canManage && <form onSubmit={submitNote} className="mt-4 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-cyan-300" />
              <strong className="text-xs text-slate-200">Investigation note</strong>
            </div>
            <textarea rows={4} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Document evidence, observations, containment actions, or next steps…" />
            <div className="mt-3 flex justify-end">
              <button className="button primary small" disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Add note'}</button>
            </div>
          </form>}

          {error && <p className="form-error" role="alert">{error}</p>}

          {(canManage || canArchive) ? <div className="modal-actions detail-actions mt-5">
            {canArchive && <button className="button danger" disabled={busy} onClick={archive}>Archive</button>}
            {canManage && <button className="button ghost" disabled={busy} onClick={beginEdit}>Edit details</button>}
            {canManage && next && <button className="button primary" disabled={busy} onClick={transition}>Move to {next}</button>}
          </div> : <p className="read-only-note">Viewer access · incident changes are disabled.</p>}
        </div>

        <aside className="min-h-0 rounded-xl border border-slate-800 bg-slate-950/20">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-cyan-300" />
              <strong className="text-xs text-slate-200">Investigation timeline</strong>
            </div>
            <span className="font-mono text-[9px] text-slate-600">{timeline.length} entries</span>
          </div>

          <div className="max-h-[560px] overflow-y-auto p-4">
            {timelineLoading ? <div className="py-8 text-center text-xs text-slate-600">Loading timeline…</div> : <div className="space-y-4">
              {timeline.map((activity, index) => <div key={activity.id} className="relative pl-6">
                {index < timeline.length - 1 && <span className="absolute left-[7px] top-5 h-[calc(100%+8px)] w-px bg-slate-800" />}
                <span className="absolute left-1 top-1.5 h-2 w-2 rounded-full bg-cyan-300 ring-4 ring-[#0a1828]" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase ${activityTone(activity.activityType)}`}>{activity.activityType}</span>
                  <span className="font-mono text-[8px] text-slate-600">{formatDate(activity.createdAt)}</span>
                </div>
                <p className="mb-1 mt-2 text-[11px] leading-5 text-slate-300">{activity.message}</p>
                <span className="text-[9px] text-slate-600">by {activity.actorDisplayName}</span>
              </div>)}

              {!timeline.length && <div className="py-8 text-center text-xs text-slate-600">No timeline entries yet.</div>}
            </div>}
          </div>
        </aside>
      </div>}
    </section>
  </div>
}
