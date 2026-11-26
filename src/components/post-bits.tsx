import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CATEGORY_ICONS } from '../features/posts/categories'
import type { Post, PostStatus, PostType } from '../features/posts/types'
import { formatDistance, timeAgo } from '../lib/format'
import { publicZoneRadius } from '../lib/geo'
import { cx, icon } from './styles'

/**
 * La firma del producto: un círculo punteado que dice "por acá, no exactamente acá".
 * Aparece en el logo, en las filas del feed y en el mapa.
 */
export function ZoneGlyph({ type, size = 16 }: { type?: PostType; size?: number }) {
  const color = type === 'LOST' ? 'var(--lost)' : type === 'FOUND' ? 'var(--found)' : 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" strokeDasharray="2.2 1.8" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2" fill={color} />
    </svg>
  )
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-md text-[17px] leading-none font-semibold text-fg">
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle
          cx="16"
          cy="16"
          r="12"
          stroke="var(--accent-ink)"
          strokeWidth="2.5"
          strokeDasharray="4.2 3.2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="4" fill="var(--accent-ink)" />
      </svg>
      Lost & Found
    </Link>
  )
}

const TYPE_LABEL: Record<PostType, string> = { LOST: 'Perdido', FOUND: 'Encontrado' }

export function TypeLabel({ type, className }: { type: PostType; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-[13px] font-medium',
        type === 'LOST' ? 'text-lost-ink' : 'text-found-ink',
        className,
      )}
    >
      <span className={cx('size-1.5 rounded-full', type === 'LOST' ? 'bg-lost' : 'bg-found')} />
      {TYPE_LABEL[type]}
    </span>
  )
}

const STATUS_LABEL: Partial<Record<PostStatus, string>> = {
  MATCHED: 'En verificación',
  RESOLVED: 'Devuelto',
  EXPIRED: 'Vencido',
}

export function StatusLabel({ status }: { status: PostStatus }) {
  const label = STATUS_LABEL[status]
  if (!label) return null
  return (
    <span className="rounded-md border border-line-strong px-1.5 py-0.5 text-[12px] leading-4 text-fg-2">
      {label}
    </span>
  )
}

export function CategoryTile({ post, size = 'md' }: { post: Post; size?: 'md' | 'lg' }) {
  const Icon = CATEGORY_ICONS[post.category.slug]
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-fg-2',
        size === 'md' ? 'size-10' : 'size-12',
      )}
    >
      <Icon {...icon} size={size === 'md' ? 18 : 20} />
    </div>
  )
}

export function ZoneMeta({ post, className }: { post: Post; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <ZoneGlyph type={post.type} size={14} />
      {post.areaName ?? 'Zona marcada'} · {formatDistance(publicZoneRadius(post.radiusM))}
    </span>
  )
}

interface PostRowProps {
  post: Post
  active?: boolean
  onHover?: (id: string | null) => void
  trailing?: ReactNode
}

/** Fila del feed: categoría, título, tipo y zona */
export function PostRow({ post, active, onHover, trailing }: PostRowProps) {
  return (
    <Link
      to={`/objetos/${post.id}`}
      onMouseEnter={() => onHover?.(post.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(post.id)}
      onBlur={() => onHover?.(null)}
      className={cx(
        'group flex gap-3 rounded-xl border px-3 py-3 transition-[background-color,border-color] duration-150',
        active ? 'border-line-strong bg-surface shadow-sm' : 'border-transparent hover:bg-surface',
        post.status === 'RESOLVED' && 'opacity-70',
      )}
    >
      <CategoryTile post={post} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[15px] leading-[22px] font-medium text-fg">{post.title}</h3>
          {trailing ?? (
            <time dateTime={post.createdAt} className="shrink-0 font-mono text-[12px] text-fg-3 tabular">
              {timeAgo(post.createdAt)}
            </time>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm leading-5 text-fg-2">{post.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-3">
          <TypeLabel type={post.type} />
          <ZoneMeta post={post} />
          <StatusLabel status={post.status} />
        </div>
      </div>
    </Link>
  )
}
