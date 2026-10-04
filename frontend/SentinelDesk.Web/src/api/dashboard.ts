import { apiRequest } from './client'
import type { Incident, SecurityEvent } from '../types'
export interface Count { label: string; count: number }
export interface Dashboard {
  byStatus: Count[]; bySeverity: Count[]; criticalActive: number; eventCount: number
  averageRisk: number; unlinkedEvents: number; highRiskEvents: number; archivedCount: number
  recentIncidents: Incident[]; recentEvents: SecurityEvent[]; generatedAt: string
}
export const getDashboard = () => apiRequest<Dashboard>('/api/dashboard')
