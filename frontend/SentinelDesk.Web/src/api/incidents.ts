import { apiRequest } from './client'
import type { Incident, IncidentInput, IncidentQuery, PagedResponse } from '../types'
import { IncidentStatus } from '../types'

export function getIncidents(query: IncidentQuery = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return apiRequest<PagedResponse<Incident>>(`/api/incidents?${params}`)
}

export const getIncident = (id: string) => apiRequest<Incident>(`/api/incidents/${id}`)
export const createIncident = (input: IncidentInput) => apiRequest<Incident>('/api/incidents', { method: 'POST', body: JSON.stringify(input) })
export const updateIncident = (id: string, input: IncidentInput) => apiRequest<Incident>(`/api/incidents/${id}`, { method: 'PUT', body: JSON.stringify(input) })
export const changeIncidentStatus = (id: string, newStatus: IncidentStatus) => apiRequest<Incident>(`/api/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ newStatus }) })
export const archiveIncident = (id: string) => apiRequest<void>(`/api/incidents/${id}`, { method: 'DELETE' })
