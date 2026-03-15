const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

interface FetchOptions extends RequestInit {
  token?: string
  workspaceId?: string
}

export async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, workspaceId, headers: customHeaders, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (workspaceId) {
    headers['x-workspace-id'] = workspaceId
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `API error: ${response.status}`)
  }

  return response.json()
}
