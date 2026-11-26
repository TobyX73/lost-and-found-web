/**
 * Acceso a publicaciones. Hoy es un mock en memoria (lo creado se guarda en localStorage).
 * Cuando la API tenga la fase 2, cada función pasa a ser una llamada a `api()` con la misma firma.
 */
import type { User } from '../../lib/auth'
import { distanceM } from '../../lib/geo'
import { categoryBySlug } from './categories'
import { findMatches } from './matching'
import { MOCK_POSTS } from './mock-data'
import type { CreatePostInput, MatchCandidate, Post, PostFilters, PostStatus } from './types'

const STORAGE_KEY = 'lf.mock.posts'
const LATENCY_MS = 250

interface Stored {
  created: Post[]
  status: Record<string, PostStatus>
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Stored
  } catch {
    // Datos corruptos: arrancamos de cero
  }
  return { created: [], status: {} }
}

function save(stored: Stored) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

function allPosts(): Post[] {
  const stored = load()
  return [...stored.created, ...MOCK_POSTS].map((p) =>
    stored.status[p.id] ? { ...p, status: stored.status[p.id] } : p,
  )
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export class NotFoundError extends Error {}

export function listPosts(filters: PostFilters = {}): Promise<Post[]> {
  const terms = filters.q ? fold(filters.q).split(/\s+/).filter(Boolean) : []
  const result = allPosts()
    .filter((p) => filters.includeClosed || p.status === 'OPEN' || p.status === 'MATCHED')
    .filter((p) => !filters.type || p.type === filters.type)
    .filter((p) => !filters.category || p.category.slug === filters.category)
    .filter((p) => !filters.authorId || p.author.id === filters.authorId)
    .filter((p) => {
      if (terms.length === 0) return true
      const haystack = fold(
        `${p.title} ${p.description} ${p.areaName ?? ''} ${Object.values(p.attributes).join(' ')}`,
      )
      return terms.every((term) => haystack.includes(term))
    })
    .filter(
      (p) =>
        !filters.near ||
        !filters.maxDistanceM ||
        distanceM(filters.near, p.publicLocation) <= filters.maxDistanceM + p.radiusM,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return delay(result)
}

export function getPost(id: string): Promise<Post> {
  const post = allPosts().find((p) => p.id === id)
  if (!post) return Promise.reject(new NotFoundError(id))
  return delay(post)
}

export function getMatches(id: string): Promise<MatchCandidate[]> {
  const all = allPosts()
  const post = all.find((p) => p.id === id)
  return delay(post ? findMatches(post, all) : [])
}

/** Simula el ajuste de la API a una grilla de ~300 m */
function snapToGrid(lat: number, lng: number) {
  const step = 300 / 111_320
  return { lat: Math.round(lat / step) * step, lng: Math.round(lng / step) * step }
}

export function createPost(input: CreatePostInput, author: User): Promise<Post> {
  const now = new Date().toISOString()
  const attributes: Post['attributes'] = {}
  for (const [key, value] of Object.entries(input.attributes) as [keyof Post['attributes'], string | undefined][]) {
    const clean = value?.trim().toLowerCase()
    if (clean) attributes[key] = clean
  }

  const post: Post = {
    id: `p-${Date.now().toString(36)}`,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    category: categoryBySlug(input.category),
    attributes,
    occurredAt: input.occurredAt,
    createdAt: now,
    publicLocation: snapToGrid(input.location.lat, input.location.lng),
    radiusM: input.radiusM,
    status: 'OPEN',
    author: { id: author.id, displayName: author.displayName },
    verificationQuestions: input.verificationQuestions?.map((q, i) => ({
      id: `q${i + 1}`,
      question: q.question.trim(),
    })),
  }
  const stored = load()
  stored.created.unshift(post)
  save(stored)
  return delay(post)
}

export function setPostStatus(id: string, status: PostStatus): Promise<void> {
  const stored = load()
  stored.status[id] = status
  save(stored)
  return delay(undefined)
}

/** Fase 7: crea un claim PENDING que revisa quien encontró el objeto */
export function submitClaim(postId: string, answers: { questionId: string; answer: string }[]): Promise<void> {
  void postId
  void answers
  return delay(undefined)
}
