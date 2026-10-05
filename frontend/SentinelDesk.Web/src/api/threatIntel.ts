import { apiRequest } from './client'
import type { ThreatIntelResponse } from '../types'

export function getCisaKev(options: {
  search?: string
  limit?: number
  refresh?: boolean
} = {}) {
  const params = new URLSearchParams()

  if (options.search) params.set('search', options.search)
  if (options.limit) params.set('limit', String(options.limit))
  if (options.refresh) params.set('refresh', 'true')

  return apiRequest<ThreatIntelResponse>(`/api/threat-intel/cisa-kev?${params.toString()}`)
}
