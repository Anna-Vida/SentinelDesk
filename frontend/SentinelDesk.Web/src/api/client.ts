const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5043').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (!response.ok) {
    const details = await response.json().catch(() => undefined) as { detail?: string; title?: string } | undefined
    throw new ApiError(details?.detail || details?.title || `Request failed (${response.status})`, response.status, details)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export { API_BASE_URL }
