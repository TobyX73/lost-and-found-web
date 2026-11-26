/**
 * Cliente HTTP de la API.
 *
 * Sesión:
 * - El access token (JWT, 15 min) vive solo en memoria.
 * - El refresh token opaco se guarda en localStorage y es de un solo uso: cada
 *   /auth/refresh devuelve uno nuevo. Si la API ve un token ya gastado revoca toda
 *   la familia, así que nunca puede haber dos refresh en paralelo con el mismo token.
 *   Por eso los refresh se deduplican dentro de la pestaña (una promesa en vuelo) y
 *   se serializan entre pestañas con Web Locks, releyendo el token dentro del lock.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api'
const REFRESH_KEY = 'lf.refreshToken'
/** Margen para refrescar antes de que el access token venza */
const EXPIRY_MARGIN_MS = 30_000

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

let accessToken: string | null = null
let accessExpiresAt = 0
let refreshInFlight: Promise<void> | null = null
const sessionEndListeners = new Set<() => void>()

export function hasStoredSession(): boolean {
  return localStorage.getItem(REFRESH_KEY) !== null
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setSession(tokens: AuthTokens): void {
  accessToken = tokens.accessToken
  accessExpiresAt = Date.now() + tokens.expiresIn * 1000
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
}

export function clearSession(): void {
  accessToken = null
  accessExpiresAt = 0
  localStorage.removeItem(REFRESH_KEY)
}

/** Se llama cuando el refresh falla y la sesión deja de ser válida */
export function onSessionEnd(listener: () => void): () => void {
  sessionEndListeners.add(listener)
  return () => sessionEndListeners.delete(listener)
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.map(String).join(', ')
  }
  return fallback
}

async function send<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(BASE_URL + path, { ...init, headers })
  } catch {
    throw new ApiError(0, 'No pudimos conectar con el servidor')
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined)
    throw new ApiError(response.status, messageFrom(body, response.statusText), body)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function doRefresh(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) throw new ApiError(401, 'Sin sesión')
  try {
    const tokens = await send<AuthTokens>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      null,
    )
    setSession(tokens)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearSession()
      sessionEndListeners.forEach((listener) => listener())
    }
    throw error
  }
}

export function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    const run =
      typeof navigator !== 'undefined' && 'locks' in navigator
        ? navigator.locks.request('lf.refresh', doRefresh)
        : doRefresh()
    refreshInFlight = run.finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** false para rutas públicas, que no llevan token */
  auth?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const init: RequestInit = {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  }

  if (!auth) return send<T>(path, init, null)

  if (!accessToken || Date.now() > accessExpiresAt - EXPIRY_MARGIN_MS) {
    await refreshSession()
  }
  try {
    return await send<T>(path, init, accessToken)
  } catch (error) {
    // El token pudo vencer o revocarse entre la verificación y la respuesta
    if (error instanceof ApiError && error.status === 401) {
      await refreshSession()
      return send<T>(path, init, accessToken)
    }
    throw error
  }
}
