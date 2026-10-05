import { apiRequest } from './client'

export interface WindowsCollectorStatus {
  configured: boolean
  lastEventAt: string | null
  eventsLast24Hours: number
}

export interface WindowsCollectorSetup {
  apiUrl: string
  apiKey: string
  scriptUrl: string
}

export const getWindowsCollectorStatus = () =>
  apiRequest<WindowsCollectorStatus>('/api/ingest/windows/status')

export const getWindowsCollectorSetup = () =>
  apiRequest<WindowsCollectorSetup>('/api/ingest/windows/setup')
