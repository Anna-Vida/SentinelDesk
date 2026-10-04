import { apiRequest, resetCsrfToken } from './client'
export interface User { id: string; email: string; roles: string[] }
export const getMe = () => apiRequest<User>('/api/auth/me')
export async function login(email: string, password: string) {
  const user = await apiRequest<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  resetCsrfToken()
  return user
}
export async function logout() { await apiRequest<void>('/api/auth/logout', { method: 'POST' }); resetCsrfToken() }
export const getUsers = () => apiRequest<User[]>('/api/auth/users')
export const createUser = (email: string, password: string, role: string) => apiRequest<User>('/api/auth/users', { method: 'POST', body: JSON.stringify({ email, password, role }) })
export async function changePassword(currentPassword: string, newPassword: string) {
  await apiRequest<void>('/api/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
  resetCsrfToken()
}
