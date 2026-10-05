import type { AuthSession } from '../types'

const STORAGE_KEY = 'sentineldesk.auth'

export function getAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session.token || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const storeAuthSession = (session: AuthSession) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))

export const clearAuthSession = () =>
  localStorage.removeItem(STORAGE_KEY)
