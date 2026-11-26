import { List, Map as MapIcon, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ZonesMap } from '../components/map'
import { PostRow } from '../components/post-bits'
import { cx, icon } from '../components/styles'
import { Button, Input, Notice, Segmented, Select, Spinner } from '../components/ui'
import { CATEGORIES } from '../features/posts/categories'
import { usePosts } from '../features/posts/hooks'
import type { CategorySlug, PostFilters, PostType } from '../features/posts/types'
import type { LatLng } from '../lib/geo'

type TypeParam = 'todos' | 'perdidos' | 'encontrados'
const TYPE_FROM_PARAM: Record<TypeParam, PostType | undefined> = {
  todos: undefined,
  perdidos: 'LOST',
  encontrados: 'FOUND',
}
const DISTANCES = [1000, 3000, 5000, 10000]

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export function FeedPage() {
  const [params, setParams] = useSearchParams()
  const typeParam = (params.get('tipo') as TypeParam | null) ?? 'todos'
  const category = (params.get('categoria') as CategorySlug | null) ?? undefined
  const distance = Number(params.get('distancia')) || undefined

  const [query, setQuery] = useState(params.get('q') ?? '')
  const debouncedQuery = useDebounced(query, 200)
  const [near, setNear] = useState<LatLng | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'lista' | 'mapa'>('lista')
  const rowRefs = useRef(new Map<string, HTMLLIElement>())

  const update = (key: string, value: string | undefined) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    update('q', debouncedQuery.trim() || undefined)
    // update cambia en cada render; solo nos importa el texto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  const filters: PostFilters = useMemo(
    () => ({
      type: TYPE_FROM_PARAM[typeParam],
      category,
      q: debouncedQuery.trim() || undefined,
      near: near ?? undefined,
      maxDistanceM: near ? distance : undefined,
    }),
    [typeParam, category, debouncedQuery, near, distance],
  )
  const { data: posts, isPending, isError, isFetching } = usePosts(filters)

  const chooseDistance = (value: string) => {
    if (!value) return update('distancia', undefined)
    if (near) return update('distancia', value)
    if (!('geolocation' in navigator)) return setLocationError(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationError(false)
        setNear({ lat: position.coords.latitude, lng: position.coords.longitude })
        update('distancia', value)
      },
      () => setLocationError(true),
      { maximumAge: 300_000, timeout: 10_000 },
    )
  }

  const selectFromMap = (id: string) => {
    setSelectedId(id)
    setMobileView('lista')
    requestAnimationFrame(() => rowRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const hasFilters = typeParam !== 'todos' || category || debouncedQuery || distance
  const clearFilters = () => {
    setQuery('')
    setParams({}, { replace: true })
  }

  const fitKey = posts?.map((p) => p.id).join(',')
  const activeId = hoveredId ?? selectedId
  const count = posts?.length ?? 0

  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      <section className={cx('min-w-0 px-4 pt-6 pb-12 sm:px-6', mobileView === 'mapa' && 'max-lg:hidden')}>
        <div className="rise-in">
          <h1 className="text-[26px] leading-[1.15] font-medium tracking-[-0.01em] text-fg">
            Objetos perdidos y encontrados
          </h1>
          <p className="mt-2 text-sm text-fg-2">
            Cada zona marca por dónde se perdió o apareció algo. La ubicación exacta nunca se publica
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">Buscar</span>
            <Search {...icon} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-3" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="pl-9"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<TypeParam>
              label="Tipo de publicación"
              value={typeParam}
              onChange={(v) => update('tipo', v === 'todos' ? undefined : v)}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'perdidos', label: 'Perdidos' },
                { value: 'encontrados', label: 'Encontrados' },
              ]}
            />
            <Select
              aria-label="Categoría"
              value={category ?? ''}
              onChange={(e) => update('categoria', e.target.value || undefined)}
              className="h-9 w-auto text-sm"
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Distancia desde tu ubicación"
              value={near && distance ? String(distance) : ''}
              onChange={(e) => chooseDistance(e.target.value)}
              className="h-9 w-auto text-sm"
            >
              <option value="">Cualquier distancia</option>
              {DISTANCES.map((d) => (
                <option key={d} value={d}>
                  A menos de {d / 1000} km
                </option>
              ))}
            </Select>
          </div>
          {locationError && (
            <Notice>No pudimos acceder a tu ubicación. Revisá los permisos del navegador para filtrar por distancia</Notice>
          )}
        </div>

        <div className="mt-6 flex h-5 items-center justify-between text-[13px] text-fg-3">
          <span className="font-mono tabular" aria-live="polite">
            {isPending ? 'Buscando' : `${count} ${count === 1 ? 'publicación' : 'publicaciones'}`}
          </span>
          {isFetching && !isPending && <span>Actualizando</span>}
        </div>

        <div className="mt-2">
          {isPending ? (
            <div className="py-12">
              <Spinner />
            </div>
          ) : isError ? (
            <Notice tone="error">No pudimos cargar las publicaciones. Probá de nuevo en un momento</Notice>
          ) : count === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
              <p className="text-[15px] text-fg">No hay publicaciones con estos filtros</p>
              <p className="mt-1 text-sm text-fg-2">Probá con otra categoría o ampliá la distancia</p>
              {hasFilters && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <ul className="-mx-3 flex flex-col gap-1">
              {posts.map((post) => (
                <li
                  key={post.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(post.id, el)
                    else rowRefs.current.delete(post.id)
                  }}
                >
                  <PostRow post={post} active={post.id === activeId} onHover={setHoveredId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section
        aria-label="Mapa de zonas"
        className={cx(
          'border-line lg:sticky lg:top-14 lg:h-[calc(100dvh-56px)] lg:border-l',
          mobileView === 'lista' ? 'max-lg:hidden' : 'h-[calc(100dvh-56px)]',
        )}
      >
        {posts && (
          <ZonesMap posts={posts} activeId={activeId} onSelect={selectFromMap} fitKey={fitKey} className="size-full" />
        )}
      </section>

      <div className="fixed inset-x-0 bottom-6 z-10 flex justify-center lg:hidden">
        <Button
          variant="secondary"
          className="shadow-float"
          onClick={() => setMobileView((v) => (v === 'lista' ? 'mapa' : 'lista'))}
        >
          {mobileView === 'lista' ? <MapIcon {...icon} /> : <List {...icon} />}
          {mobileView === 'lista' ? 'Ver mapa' : 'Ver lista'}
        </Button>
      </div>
    </main>
  )
}
