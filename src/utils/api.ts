export function getHmacDeviceId(): string {
  return import.meta.env.VITE_HMAC_DEVICE_ID ?? 'web-client'
}

export function getHmacDeviceSecret(): string {
  return import.meta.env.VITE_HMAC_DEVICE_SECRET ?? ''
}

function randomNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  return bytesToHex(await crypto.subtle.digest('SHA-256', data))
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return bytesToHex(signature)
}

function pathWithQuery(url: URL): string {
  return `${url.pathname}${url.search}`
}

async function buildHmacSignature(method: string, path: string, body: string, timestamp: string, nonce: string) {
  const bodyHash = await sha256Hex(body)
  const canonical = [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n')
  return hmacSha256Hex(getHmacDeviceSecret(), canonical)
}

function normalizeBody(body: BodyInit | null | undefined): string {
  if (!body) return ''
  if (typeof body === 'string') return body
  throw new Error('HMAC apiFetch currently supports string request bodies only')
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const secret = getHmacDeviceSecret()
  const headers = new Headers(init?.headers)
  if (!secret) {
    return fetch(path, { ...init, headers })
  }

  const url = new URL(path, window.location.origin)
  const method = init?.method ?? 'GET'
  const body = normalizeBody(init?.body)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomNonce()
  const signature = await buildHmacSignature(method, pathWithQuery(url), body, timestamp, nonce)

  headers.set('X-Device-Id', getHmacDeviceId())
  headers.set('X-Timestamp', timestamp)
  headers.set('X-Nonce', nonce)
  headers.set('X-Signature', signature)

  return fetch(path, { ...init, headers })
}

export async function withSignedUrl(url: string): Promise<string> {
  const secret = getHmacDeviceSecret()
  if (!secret) return url

  const signedUrl = new URL(url, window.location.origin)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomNonce()
  const signature = await buildHmacSignature('GET', signedUrl.pathname, '', timestamp, nonce)

  signedUrl.searchParams.set('device_id', getHmacDeviceId())
  signedUrl.searchParams.set('timestamp', timestamp)
  signedUrl.searchParams.set('nonce', nonce)
  signedUrl.searchParams.set('signature', signature)

  if (/^https?:\/\//.test(url)) {
    return signedUrl.toString()
  }
  return `${signedUrl.pathname}${signedUrl.search}`
}

export function withApiToken(url: string): string {
  const legacySecret = import.meta.env.VITE_API_SECRET ?? ''
  if (!legacySecret) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(legacySecret)}`
}
