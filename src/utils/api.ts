export function getApiSecret(): string {
  return import.meta.env.VITE_API_SECRET ?? ''
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const secret = getApiSecret()
  const headers = new Headers(init?.headers)
  if (secret) {
    headers.set('X-API-Key', secret)
  }
  return fetch(path, { ...init, headers })
}

export function withApiToken(url: string): string {
  const secret = getApiSecret()
  if (!secret) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(secret)}`
}
