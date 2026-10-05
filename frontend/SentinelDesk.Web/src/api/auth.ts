import { apiRequest } from './client'
import type { AuthSession } from '../types'

export interface BootstrapStatus {
  requiresSetup: boolean
}

export const getBootstrapStatus = () =>
  apiRequest<BootstrapStatus>('/api/auth/bootstrap-status')

export const login = (email: string, password: string) =>
  apiRequest<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const register = (
  displayName: string,
  email: string,
  password: string,
) => apiRequest<AuthSession>('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ displayName, email, password }),
})
