// Same-origin requests keep session cookies private and avoid cross-site cookie restrictions.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
let csrfToken: string | undefined
let csrfRequest: Promise<string> | undefined
export function resetCsrfToken() { csrfToken = undefined; csrfRequest = undefined }

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) { super(message); this.name = 'ApiError' }
}
async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  if (!csrfRequest) csrfRequest = fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: 'include' })
    .then(async response => {
      if (!response.ok) throw new ApiError('Unable to start a secure session. Try again.', response.status)
      const data = await response.json() as { token: string }
      csrfToken = data.token
      return data.token
    }).finally(() => { csrfRequest = undefined })
  return csrfRequest
}
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method ?? 'GET').toUpperCase())) headers.set('X-CSRF-TOKEN', await getCsrfToken())
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, credentials: 'include', headers })
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth/')) window.dispatchEvent(new Event('session-expired'))
    const details = await response.json().catch(() => undefined) as { detail?: string; title?: string; errors?: Record<string, string[]> } | undefined
    const validation = details?.errors ? Object.values(details.errors).flat().join(' ') : undefined
    throw new ApiError(validation || details?.detail || details?.title || `Request failed (${response.status})`, response.status, details)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
export { API_BASE_URL }
