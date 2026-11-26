import { LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { PageContainer } from '../components/layout'
import { PostRow } from '../components/post-bits'
import { icon } from '../components/styles'
import { Button, Field, Input, LinkButton, Notice, Segmented, Spinner } from '../components/ui'
import { usePosts } from '../features/posts/hooks'
import { authErrorMessage, useAuth, type User } from '../lib/auth'
import { formatMonthYear, initials } from '../lib/format'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  return (
    <PageContainer>
      <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
        <aside className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full border border-line-strong bg-raised text-[15px] font-medium text-fg-2">
              {initials(user.displayName)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] leading-7 font-medium text-fg">{user.displayName}</h1>
              <p className="text-[13px] text-fg-3">Desde {formatMonthYear(user.createdAt)}</p>
            </div>
          </div>
          <ProfileForm key={user.displayName} user={user} />
          <Button
            variant="ghost"
            className="self-start"
            onClick={async () => {
              await logout()
              navigate('/', { replace: true })
            }}
          >
            <LogOut {...icon} />
            Cerrar sesión
          </Button>
        </aside>
        <MyPosts userId={user.id} />
      </div>
    </PageContainer>
  )
}

function ProfileForm({ user }: { user: User }) {
  const { updateDisplayName } = useAuth()
  const [name, setName] = useState(user.displayName)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()
  const changed = trimmed !== user.displayName
  const invalid = trimmed.length < 2 || trimmed.length > 50

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!changed || invalid) return
    setState('saving')
    setError(null)
    try {
      await updateDisplayName(trimmed)
      setState('saved')
    } catch (err) {
      setError(authErrorMessage(err))
      setState('idle')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      {error && <Notice tone="error">{error}</Notice>}
      <Field label="Nombre" error={changed && invalid ? 'Entre 2 y 50 caracteres' : undefined}>
        {(props) => (
          <Input
            {...props}
            value={name}
            maxLength={50}
            onChange={(e) => {
              setName(e.target.value)
              setState('idle')
            }}
          />
        )}
      </Field>
      <Field label="Email" hint="No se muestra en tus publicaciones">
        {(props) => <Input {...props} value={user.email} readOnly disabled />}
      </Field>
      <div className="flex h-9 items-center gap-3">
        <Button type="submit" variant="secondary" disabled={!changed || invalid} loading={state === 'saving'}>
          Guardar
        </Button>
        {state === 'saved' && <span className="text-[13px] text-fg-3">Guardado</span>}
      </div>
    </form>
  )
}

type Tab = 'abiertas' | 'todas'

function MyPosts({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('abiertas')
  const { data: posts, isPending } = usePosts({ authorId: userId, includeClosed: tab === 'todas' })

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] leading-6 font-medium text-fg">Tus publicaciones</h2>
        <Segmented<Tab>
          label="Filtrar publicaciones"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'abiertas', label: 'Abiertas' },
            { value: 'todas', label: 'Todas' },
          ]}
        />
      </div>
      <div className="mt-4">
        {isPending ? (
          <Spinner />
        ) : !posts || posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
            <p className="text-[15px] text-fg">Todavía no publicaste nada</p>
            <p className="mt-1 text-sm text-fg-2">Si perdiste o encontraste algo, empezá por acá</p>
            <LinkButton to="/publicar" size="sm" className="mt-4">
              Publicar un objeto
            </LinkButton>
          </div>
        ) : (
          <ul className="-mx-3 flex flex-col gap-1">
            {posts.map((post) => (
              <li key={post.id}>
                <PostRow post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
