import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button, Field, Input, Notice } from '../components/ui'
import { authErrorMessage, useAuth } from '../lib/auth'

/** Solo acepta rutas internas, para que ?next= no pueda llevar a otro sitio */
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
      <div className="rise-in w-full max-w-[400px]">
        <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.01em] text-fg">{title}</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-fg-2">{subtitle}</p>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">{children}</div>
        <p className="mt-6 text-center text-sm text-fg-2">{footer}</p>
      </div>
    </main>
  )
}

const linkClass = 'rounded-sm font-medium text-accent-ink underline-offset-4 hover:underline'

export function LoginPage() {
  const { user, login } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (user && !pending) return <Navigate to={next} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login({ email: email.trim(), password })
      navigate(next, { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Ingresar"
      subtitle="Para publicar, reclamar un objeto o seguir tus publicaciones"
      footer={
        <>
          ¿No tenés cuenta?{' '}
          <Link to={`/registrarse${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className={linkClass}>
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Email">
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="Contraseña">
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
          Ingresar
        </Button>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get('next'))
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ displayName?: string; password?: string }>({})
  const [pending, setPending] = useState(false)

  if (user && !pending) return <Navigate to={next} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const errors: typeof fieldErrors = {}
    const name = displayName.trim()
    if (name.length < 2 || name.length > 50) errors.displayName = 'Entre 2 y 50 caracteres'
    if (password.length < 8) errors.password = 'Al menos 8 caracteres'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setError(null)
    setPending(true)
    try {
      await register({ displayName: name, email: email.trim(), password })
      navigate(next, { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
      setPending(false)
    }
  }

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Tu nombre es lo que ven las personas con las que coordines una devolución"
      footer={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link to={`/ingresar${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className={linkClass}>
            Ingresar
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Nombre" error={fieldErrors.displayName}>
          {(props) => (
            <Input
              {...props}
              autoComplete="name"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Email">
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="Contraseña" error={fieldErrors.password} hint="Al menos 8 caracteres">
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="new-password"
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
          Crear cuenta
        </Button>
      </form>
    </AuthShell>
  )
}
