import { apiRequest } from './client'
import type { AuthSession } from '../types'

export interface BootstrapStatus {
  requiresSetup: boolean
}

export interface AccessRequest {
  id: string
  email: string
  displayName: string
  status: 'Pending'
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

export const requestAccess = (
  displayName: string,
  email: string,
  password: string,
) => apiRequest<AccessRequest>('/api/auth/request-access', {
  method: 'POST',
  body: JSON.stringify({ displayName, email, password }),
})
