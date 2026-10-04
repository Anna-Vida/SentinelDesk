import { apiRequest } from './client'
import type { SecurityEvent, SecurityEventInput, PagedResponse } from '../types'
export interface EventQuery { page?: number; pageSize?: number; search?: string; minRisk?: number; unlinkedOnly?: boolean; incidentId?: string }
export function getSecurityEvents(query: EventQuery = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)) })
  return apiRequest<PagedResponse<SecurityEvent>>(`/api/security-events?${params}`)
}
export const createSecurityEvent = (input: SecurityEventInput) => apiRequest<SecurityEvent>('/api/security-events', { method: 'POST', body: JSON.stringify(input) })
export const linkSecurityEvent = (eventId: string, incidentId: string) => apiRequest<SecurityEvent>(`/api/security-events/${eventId}/incident/${incidentId}`, { method: 'PATCH' })
