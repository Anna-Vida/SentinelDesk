import { apiRequest } from './client'
import { UserRole } from '../types'

export interface WorkspaceUser {
  id: string
  email: string
  displayName: string
  role: UserRole
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
