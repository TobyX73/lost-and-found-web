import { ArrowLeft, CircleCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { PageContainer } from '../components/layout'
import { ZonesMap } from '../components/map'
import { CategoryTile, StatusLabel, TypeLabel, ZoneGlyph } from '../components/post-bits'
import { icon } from '../components/styles'
import { Button, Field, Input, LinkButton, Spinner } from '../components/ui'
import { useMatches, usePost, useSetPostStatus, useSubmitClaim } from '../features/posts/hooks'
import type { MatchCandidate, Post } from '../features/posts/types'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatDistance, timeAgo } from '../lib/format'
import { publicZoneRadius } from '../lib/geo'

const ATTRIBUTE_LABEL: Record<string, string> = { color: 'Color', marca: 'Marca', modelo: 'Modelo' }

export function PostPage() {
  const { id = '' } = useParams()
  const { data: post, isPending, isError } = usePost(id)

  if (isPending) {
    return (
      <PageContainer>
        <Spinner />
      </PageContainer>
    )
  }
  if (isError || !post) {
    return (
      <PageContainer>
        <h1 className="text-[28px] font-medium text-fg">No encontramos esta publicación</h1>
        <p className="mt-2 text-fg-2">Puede que se haya borrado o que el enlace esté mal</p>
        <LinkButton to="/" variant="secondary" className="mt-6">
          Volver a explorar
        </LinkButton>
      </PageContainer>
    )
  }
  return <PostDetail post={post} />
}

function PostDetail({ post }: { post: Post }) {
  const { user } = useAuth()
  const isOwner = user?.id === post.author.id
  const attributes = Object.entries(post.attributes).filter(([, v]) => v)

  return (
    <PageContainer>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-md text-sm text-fg-2 transition-colors hover:text-fg"
      >
        <ArrowLeft {...icon} />
        Explorar
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <article className="rise-in min-w-0">
          <div className="flex items-center gap-3">
            <TypeLabel type={post.type} />
            <StatusLabel status={post.status} />
          </div>
          <div className="mt-3 flex items-start gap-4">
            <CategoryTile post={post} size="lg" />
            <div className="min-w-0">
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.01em] text-fg sm:text-[32px]">
                {post.title}
              </h1>
              <p className="mt-2 text-sm text-fg-2">{post.category.name}</p>
            </div>
          </div>

          <p className="mt-6 max-w-[60ch] text-[15px] leading-[24px] whitespace-pre-line text-fg">
            {post.description}
          </p>

          <dl className="mt-8 grid max-w-xl grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-line pt-6 text-sm">
            <dt className="text-fg-3">{post.type === 'LOST' ? 'Se perdió' : 'Se encontró'}</dt>
            <dd className="font-mono text-[13px] text-fg tabular">{formatDateTime(post.occurredAt)}</dd>
            <dt className="text-fg-3">Zona</dt>
            <dd className="text-fg">
              {post.areaName ?? 'Zona marcada en el mapa'}
              <span className="ml-2 font-mono text-[13px] text-fg-3 tabular">
                {formatDistance(publicZoneRadius(post.radiusM))} de radio
              </span>
            </dd>
            {attributes.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-fg-3">{ATTRIBUTE_LABEL[key] ?? key}</dt>
                <dd className="text-fg first-letter:uppercase">{value}</dd>
              </div>
            ))}
            <dt className="text-fg-3">Publicado por</dt>
            <dd className="text-fg">
              {isOwner ? 'Vos' : post.author.displayName}
              <span className="ml-2 font-mono text-[13px] text-fg-3 tabular">{timeAgo(post.createdAt)}</span>
            </dd>
          </dl>

          <div className="mt-8 max-w-xl">
            {isOwner ? <OwnerPanel post={post} /> : post.type === 'FOUND' ? <ClaimPanel post={post} /> : <FoundItPanel post={post} />}
          </div>
        </article>

        <aside className="flex min-w-0 flex-col gap-8">
          <figure>
            <div className="h-[320px] overflow-hidden rounded-2xl border border-line bg-raised">
              <ZonesMap posts={[post]} activeId={post.id} fitKey={post.id} maxZoom={15} className="size-full" />
            </div>
            <figcaption className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-fg-3">
              <ZoneGlyph type={post.type} size={14} />
              Zona aproximada. El punto exacto queda guardado y solo se comparte cuando se verifica al dueño
            </figcaption>
          </figure>
          <Matches post={post} />
        </aside>
      </div>
    </PageContainer>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-[17px] leading-6 font-medium text-fg">{title}</h2>
      {children}
    </section>
  )
}

function ClaimPanel({ post }: { post: Post }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const claim = useSubmitClaim()
  const [open, setOpen] = useState(false)
  const questions = post.verificationQuestions ?? []
  const [answers, setAnswers] = useState<Record<string, string>>({})

  if (post.status !== 'OPEN') {
    return (
      <Panel title={post.status === 'RESOLVED' ? 'Ya volvió a su dueño' : 'Alguien ya lo está reclamando'}>
        <p className="mt-2 text-sm leading-5 text-fg-2">
          {post.status === 'RESOLVED'
            ? 'Quien lo encontró marcó que ya se entregó'
            : 'Quien lo encontró está revisando las respuestas de otra persona'}
        </p>
      </Panel>
    )
  }

  if (claim.isSuccess) {
    return (
      <Panel title="Respuestas enviadas">
        <p className="mt-2 flex gap-2 text-sm leading-5 text-fg-2">
          <CircleCheck {...icon} className="mt-0.5 text-positive" />
          {post.author.displayName} las va a comparar con lo que sabe del objeto. Si coinciden, se abre un chat para
          coordinar la entrega
        </p>
      </Panel>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    claim.mutate({
      postId: post.id,
      answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id]?.trim() ?? '' })),
    })
  }

  return (
    <Panel title="¿Es tuyo?">
      <p className="mt-2 text-sm leading-5 text-fg-2">
        Quien lo encontró dejó {questions.length === 1 ? 'una pregunta' : `${questions.length} preguntas`} sobre detalles
        que solo el dueño conoce. Tus respuestas solo las ve esa persona
      </p>
      {!open ? (
        <Button
          className="mt-5"
          onClick={() => (user ? setOpen(true) : navigate(`/ingresar?next=${encodeURIComponent(`/objetos/${post.id}`)}`))}
        >
          Es mío
        </Button>
      ) : (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          {questions.map((q) => (
            <Field key={q.id} label={q.question}>
              {(props) => (
                <Input
                  {...props}
                  required
                  maxLength={200}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </Field>
          ))}
          <div className="flex gap-2">
            <Button type="submit" loading={claim.isPending}>
              Enviar respuestas
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Panel>
  )
}

function FoundItPanel({ post }: { post: Post }) {
  return (
    <Panel title="¿Lo encontraste?">
      <p className="mt-2 text-sm leading-5 text-fg-2">
        Publicá lo que encontraste con una pregunta que solo el dueño pueda responder. Si coincide con esta
        publicación, le avisamos a {post.author.displayName}
      </p>
      <LinkButton to={`/publicar?tipo=FOUND&categoria=${post.category.slug}`} className="mt-5">
        Lo encontré
      </LinkButton>
    </Panel>
  )
}

function OwnerPanel({ post }: { post: Post }) {
  const setStatus = useSetPostStatus()
  if (post.status === 'RESOLVED') {
    return (
      <Panel title="Marcado como devuelto">
        <p className="mt-2 text-sm leading-5 text-fg-2">Esta publicación ya no aparece en el feed</p>
      </Panel>
    )
  }
  return (
    <Panel title="Es tu publicación">
      <p className="mt-2 text-sm leading-5 text-fg-2">
        {post.type === 'LOST'
          ? 'Te avisamos cuando alguien publique algo que coincida. Cuando lo recuperes, marcalo como devuelto'
          : 'Te avisamos cuando alguien responda tus preguntas. Cuando lo entregues, marcalo como devuelto'}
      </p>
      <Button
        variant="secondary"
        className="mt-5"
        loading={setStatus.isPending}
        onClick={() => setStatus.mutate({ id: post.id, status: 'RESOLVED' })}
      >
        Marcar como devuelto
      </Button>
    </Panel>
  )
}

function Matches({ post }: { post: Post }) {
  const { data: matches } = useMatches(post.id)
  if (!matches || matches.length === 0 || post.status !== 'OPEN') return null

  return (
    <section>
      <h2 className="text-[15px] font-medium text-fg">Posibles coincidencias</h2>
      <p className="mt-1 text-[13px] leading-5 text-fg-3">
        {post.type === 'LOST' ? 'Objetos encontrados' : 'Objetos perdidos'} de la misma categoría, cerca y en fechas
        compatibles
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {matches.slice(0, 3).map((match) => (
          <MatchRow key={match.post.id} match={match} />
        ))}
      </ul>
    </section>
  )
}

const SIGNALS = [
  { key: 'text', label: 'Descripción' },
  { key: 'distance', label: 'Distancia' },
  { key: 'date', label: 'Fecha' },
  { key: 'attributes', label: 'Atributos' },
] as const

function MatchRow({ match }: { match: MatchCandidate }) {
  const percent = Math.round(match.score.total * 100)
  return (
    <li>
      <Link
        to={`/objetos/${match.post.id}`}
        className="block rounded-xl border border-line bg-surface p-4 shadow-sm transition-colors duration-150 hover:border-line-strong"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium text-fg">{match.post.title}</span>
          <span className="shrink-0 font-mono text-[13px] text-accent-ink tabular">{percent} %</span>
        </div>
        <p className="mt-1 text-[13px] text-fg-3">
          {match.post.areaName} · a {formatDistance(match.distanceM)} · {timeAgo(match.post.createdAt)}
        </p>
        <dl className="mt-3 grid grid-cols-4 gap-2">
          {SIGNALS.map((signal) => (
            <div key={signal.key}>
              <dt className="text-[12px] leading-4 text-fg-3">{signal.label}</dt>
              <dd className="mt-1.5 h-1 overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-fg-3"
                  style={{ width: `${Math.round(match.score[signal.key] * 100)}%` }}
                />
              </dd>
            </div>
          ))}
        </dl>
      </Link>
    </li>
  )
}
