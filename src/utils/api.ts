import { getCookie } from './cookie'

export function getApiSecret(): string {
    return import.meta.env.VITE_API_SECRET ?? ''
}

export function getAuthToken(): string | null {
    return getCookie('token')
}
export function getHmacDeviceId(): string {
  return import.meta.env.VITE_HMAC_DEVICE_ID ?? 'web-client'
}

export function getHmacDeviceSecret(): string {
  return import.meta.env.VITE_HMAC_DEVICE_SECRET ?? ''
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  return bytesToHex(await crypto.subtle.digest('SHA-256', data))
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
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

function randomNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
    const secret =getHmacDeviceSecret()
    const token = getAuthToken()
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


    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
    }

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
    const secret = getApiSecret()
    if (!secret) return url
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}token=${encodeURIComponent(secret)}`
}

/**
 * Gọi API logout / revoke token lên backend
 * Hỗ trợ các endpoint: /logout, /revoke, /auth/logout, /auth/revoke
 */
export async function logoutApi(token?: string | null): Promise<boolean> {
    const activeToken = token || getAuthToken()
    if (!activeToken) return false

    const headers = {
        'Authorization': `Bearer ${activeToken}`,
        'Content-Type': 'application/json'
    }
    const body = JSON.stringify({ token: activeToken })

    const endpoints = [
        'http://localhost:8080/logout',
        'http://localhost:8080/auth/logout',
        'http://localhost:8080/revoke',
        'http://localhost:8080/auth/revoke'
    ]

    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers,
                body
            })
            if (res.ok) {
                console.log(`[Logout API] Gọi thành công tới: ${url}`)
                return true
            }
        } catch (e) {
            console.warn(`[Logout API] Thử kết nối ${url} thất bại:`, e)
        }
    }
    return false
}

/**
 * Gọi API đăng ký tài khoản mới lên backend (/register hoặc /auth/register)
 */
export async function registerApi(data: { username: string; password: string; role?: string }) {
    const payload = {
        username: data.username,
        password: data.password,
        role: data.role || 'USER'
    }

    const endpoints = [
        'http://localhost:8080/auth/register',
        'http://localhost:8080/register'
    ]

    let lastError = ''

    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const resText = await res.text()
            let resJson: any = null
            try {
                resJson = JSON.parse(resText)
            } catch {
                // text body
            }

            if (res.status === 201 || res.status === 200 || res.ok) {
                return {
                    success: true,
                    message: resJson?.message || (typeof resJson === 'string' ? resJson : resText) || 'Đăng ký tài khoản thành công',
                    username: resJson?.username || data.username
                }
            } else {
                const errorMsg = resJson?.message || (typeof resJson === 'string' ? resJson : resText) || 'Đăng ký thất bại'
                if (res.status === 404) {
                    lastError = errorMsg
                    continue
                }
                return {
                    success: false,
                    message: errorMsg
                }
            }
        } catch (e: any) {
            lastError = e.message || 'Lỗi kết nối đến máy chủ'
        }
    }

    return {
        success: false,
        message: lastError || 'Lỗi kết nối đến máy chủ'
    }
}