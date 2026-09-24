export enum IncidentSeverity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export enum IncidentStatus {
  Open = 'Open',
  Investigating = 'Investigating',
  Contained = 'Contained',
  Resolved = 'Resolved',
  Closed = 'Closed',
}

export interface Incident {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  isArchived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SecurityEvent {
  id: string
  eventType: string
  sourceIp: string
  description: string
  riskScore: number
  detectedAt: string
  incidentId: string | null
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type IncidentInput = Pick<Incident, 'title' | 'description' | 'severity'>
export type SecurityEventInput = Pick<SecurityEvent, 'eventType' | 'sourceIp' | 'description' | 'riskScore'> & { incidentId?: string }

export interface IncidentQuery {
  page?: number
  pageSize?: number
  search?: string
  severity?: IncidentSeverity
  status?: IncidentStatus
  includeArchived?: boolean
}

export type ConnectionState = 'Connected' | 'Reconnecting' | 'Disconnected'

export interface RealtimeEvents {
  IncidentCreated: IncidentInput & { id: string; status: IncidentStatus; createdAt: string }
  IncidentUpdated: IncidentInput & { id: string; updatedAt: string }
  IncidentStatusChanged: { incidentId: string; previousStatus: IncidentStatus; newStatus: IncidentStatus; updatedAt: string }
  IncidentArchived: { incidentId: string; archivedAt: string }
  SecurityEventCreated: SecurityEvent
  SecurityEventLinked: { eventId: string; incidentId: string; linkedAt: string }
}
