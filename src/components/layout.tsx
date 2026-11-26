import { Moon, Plus, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { initials } from '../lib/format'
import { useTheme } from '../lib/theme'
import { Logo } from './post-bits'
import { cx, icon } from './styles'
import { IconButton, LinkButton, Spinner } from './ui'

function Header() {
  const { user, isRestoring } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-sm">
      <div className="flex h-14 items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Principal">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cx(
                'rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
                isActive ? 'bg-raised text-fg' : 'text-fg-2 hover:text-fg',
              )
            }
          >
            Explorar
          </NavLink>
          {user && (
            <NavLink
              to="/perfil"
              className={({ isActive }) =>
                cx(
                  'rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
                  isActive ? 'bg-raised text-fg' : 'text-fg-2 hover:text-fg',
                )
              }
            >
              Mis publicaciones
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <IconButton label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'} onClick={toggle}>
            {theme === 'dark' ? <Sun {...icon} /> : <Moon {...icon} />}
          </IconButton>
          {!isRestoring && !user && (
            <Link to="/ingresar" className="rounded-md px-2 py-1.5 text-sm text-fg-2 transition-colors hover:text-fg">
              Ingresar
            </Link>
          )}
          <LinkButton to="/publicar" size="sm">
            <Plus {...icon} />
            Publicar
          </LinkButton>
          {user && (
            <Link
              to="/perfil"
              aria-label={`Perfil de ${user.displayName}`}
              className="ml-1 flex size-8 items-center justify-center rounded-full border border-line-strong bg-raised text-[12px] font-medium text-fg-2 transition-colors hover:text-fg"
            >
              {initials(user.displayName)}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <Outlet />
    </div>
  )
}

/** Rutas que necesitan sesión: mandan a /ingresar y vuelven después */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isRestoring } = useAuth()
  const location = useLocation()

  if (isRestoring) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Spinner />
      </div>
    )
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/ingresar?next=${next}`} replace />
  }
  return children
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx('mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12', className)}>{children}</main>
}
