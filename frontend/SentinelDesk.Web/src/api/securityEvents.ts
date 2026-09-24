import { apiRequest } from './client'
import type { SecurityEvent, SecurityEventInput } from '../types'

export const getSecurityEvents = () => apiRequest<SecurityEvent[]>('/api/security-events')
export const getSecurityEvent = (id: string) => apiRequest<SecurityEvent>(`/api/security-events/${id}`)
export const createSecurityEvent = (input: SecurityEventInput) => apiRequest<SecurityEvent>('/api/security-events', { method: 'POST', body: JSON.stringify(input) })
export const linkSecurityEvent = (eventId: string, incidentId: string) => apiRequest<SecurityEvent>(`/api/security-events/${eventId}/incident/${incidentId}`, { method: 'PATCH' })
