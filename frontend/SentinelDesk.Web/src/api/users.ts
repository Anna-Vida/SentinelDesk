import { apiRequest } from './client'
import { UserRole } from '../types'

export interface WorkspaceUser {
  id: string
  email: string
  displayName: string
  role: UserRole
  isApproved: boolean
  createdAt: string
}

export interface CreateWorkspaceUserInput {
  displayName: string
  email: string
  password: string
  role: UserRole
}

export const getUsers = () => apiRequest<WorkspaceUser[]>('/api/users')

export const createUser = (input: CreateWorkspaceUserInput) =>
  apiRequest<WorkspaceUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const approveUser = (id: string, role: UserRole.Viewer | UserRole.Analyst) =>
  apiRequest<WorkspaceUser>(`/api/users/${id}/approval`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

export const rejectAccessRequest = (id: string) =>
  apiRequest<void>(`/api/users/${id}/request`, {
    method: 'DELETE',
  })
