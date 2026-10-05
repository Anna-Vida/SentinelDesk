import { apiRequest } from './client'
import { UserRole, type AuthSession } from '../types'

export const login = (email: string, password: string) =>
  apiRequest<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const register = (
  displayName: string,
  email: string,
  password: string,
  role: UserRole.Viewer | UserRole.Analyst,
) => apiRequest<AuthSession>('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ displayName, email, password, role }),
})
