import { apiRequest } from './client'
import type { DetectionRule, IncidentSeverity } from '../types'

export const getDetectionRules = () =>
  apiRequest<DetectionRule[]>('/api/detection-rules')

export const updateDetectionRule = (
  id: string,
  input: {
    isEnabled: boolean
    severity: IncidentSeverity
    triggerCount: number
    windowMinutes: number
    riskScore: number
    matchPatterns: string
  },
) =>
  apiRequest<DetectionRule>(`/api/detection-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
