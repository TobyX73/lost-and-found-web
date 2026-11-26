import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, use, useEffect, useMemo, type ReactNode } from 'react'
import {
  api,
  ApiError,
  clearSession,
  getRefreshToken,
  hasStoredSession,
  onSessionEnd,
  setSession,
  type AuthTokens,
} from './api-client'

/** Forma de PublicUser en la API (las fechas llegan como ISO string) */
export interface User {
  id: string
  email: string
  displayName: string
  createdAt: string
}

interface AuthResult extends AuthTokens {
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  displayName: string
}

interface AuthContextValue {
  user: User | null
  /** true mientras se recupera la sesión guardada al abrir la app */
  isRestoring: boolean
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const ME_KEY = ['me'] as const

async function fetchMe(): Promise<User | null> {
  if (!hasStoredSession()) return null
  try {
    return await api<User>('/users/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  })

  useEffect(
    () => onSessionEnd(() => queryClient.setQueryData(ME_KEY, null)),
    [queryClient],
  )

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) =>
      api<AuthResult>('/auth/login', { method: 'POST', body: input, auth: false }),
  })
  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) =>
      api<AuthResult>('/auth/register', { method: 'POST', body: input, auth: false }),
  })

  const loginAsync = loginMutation.mutateAsync
  const registerAsync = registerMutation.mutateAsync

  const value = useMemo<AuthContextValue>(() => {
    const start = (result: AuthResult) => {
      setSession(result)
      queryClient.setQueryData(ME_KEY, result.user)
      return result.user
    }

    return {
      user: me.data ?? null,
      isRestoring: me.isPending,
      login: async (input) => start(await loginAsync(input)),
      register: async (input) => start(await registerAsync(input)),
      logout: async () => {
        const refreshToken = getRefreshToken()
        clearSession()
        queryClient.setQueryData(ME_KEY, null)
        if (refreshToken) {
          // Si falla, el token igual vence solo: no bloqueamos la salida
          await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(
            () => undefined,
          )
        }
      },
      updateDisplayName: async (displayName) => {
        const user = await api<User>('/users/me', { method: 'PATCH', body: { displayName } })
        queryClient.setQueryData(ME_KEY, user)
        return user
      },
    }
  }, [me.data, me.isPending, queryClient, loginAsync, registerAsync])

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return context
}

/** Traduce los errores de la API de auth a texto para la persona */
export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Algo salió mal. Probá de nuevo'
  if (error.status === 0) return 'No pudimos conectar con el servidor. Revisá que la API esté corriendo'
  if (error.status === 401) return 'El email o la contraseña no coinciden'
  if (error.status === 409) return 'Ya hay una cuenta con ese email'
  if (error.status === 400) return 'Revisá los datos del formulario'
  if (error.status === 429) return 'Demasiados intentos. Esperá un momento'
  return 'Algo salió mal. Probá de nuevo'
}
