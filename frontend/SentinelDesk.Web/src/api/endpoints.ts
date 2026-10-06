import { apiRequest } from './client'
import type { EndpointSummary } from '../types'

export const getEndpoints = () =>
  apiRequest<EndpointSummary[]>('/api/endpoints')

export const setEndpointEnabled = (id: string, enabled: boolean) =>
  apiRequest<EndpointSummary>(`/api/endpoints/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
