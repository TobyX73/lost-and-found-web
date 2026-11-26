/**
 * Puntaje de coincidencia entre un LOST y un FOUND, igual al de docs/ARCHITECTURE.md (fase 5).
 * Cuando la API calcule los matches, esto queda solo para el mock.
 */
import { distanceM } from '../../lib/geo'
import type { MatchCandidate, MatchScore, Post } from './types'

export const MATCH_WEIGHTS = { text: 0.35, distance: 0.3, date: 0.2, attributes: 0.15 }
export const MATCH_THRESHOLD = 0.6
const MAX_DISTANCE_M = 3000
const DAY = 86_400_000

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')

/** Trigramas como pg_trgm: cada palabra con dos espacios adelante y uno atrás */
function trigrams(s: string): Set<string> {
  const set = new Set<string>()
  for (const word of normalize(s).split(/\s+/).filter(Boolean)) {
    const padded = `  ${word} `
    for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3))
  }
  return set
}

export function similarity(a: string, b: string): number {
  const ta = trigrams(a)
  const tb = trigrams(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / (ta.size + tb.size - shared)
}

const STOPWORDS = new Set(
  'de la el en con los las del una uno un por para que se me lo al y o a es su sus mi tiene muy'.split(' '),
)
const words = (s: string) =>
  new Set(
    normalize(s)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  )

/** Aproxima el ts_rank de la descripción: proporción de palabras con contenido en común */
function descriptionOverlap(a: string, b: string): number {
  const wa = words(a)
  const wb = words(b)
  if (wa.size === 0 || wb.size === 0) return 0
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / Math.min(wa.size, wb.size)
}

export function scorePair(lost: Post, found: Post): { score: MatchScore; distanceM: number } {
  const d = distanceM(lost.publicLocation, found.publicLocation)
  const days = Math.abs(new Date(found.occurredAt).getTime() - new Date(lost.occurredAt).getTime()) / DAY

  const text = Math.min(
    1,
    0.8 * similarity(lost.title, found.title) + 0.2 * descriptionOverlap(lost.description, found.description),
  )
  const distance = Math.exp(-Math.max(0, d - lost.radiusM - found.radiusM) / 1500)
  const date = Math.exp(-days / 7)

  const keys = (Object.keys(lost.attributes) as (keyof Post['attributes'])[]).filter(
    (k) => lost.attributes[k] && found.attributes[k],
  )
  const attributes =
    keys.length === 0 ? 0 : keys.filter((k) => lost.attributes[k] === found.attributes[k]).length / keys.length

  const total =
    text * MATCH_WEIGHTS.text +
    distance * MATCH_WEIGHTS.distance +
    date * MATCH_WEIGHTS.date +
    attributes * MATCH_WEIGHTS.attributes

  return { score: { total, text, distance, date, attributes }, distanceM: d }
}

/** Candidatos del tipo opuesto con la misma ventana que el SQL del documento */
export function findMatches(post: Post, all: Post[]): MatchCandidate[] {
  return all
    .filter((other) => {
      if (other.type === post.type || other.status !== 'OPEN' || other.category.id !== post.category.id) return false
      const [lost, found] = post.type === 'LOST' ? [post, other] : [other, post]
      const lostAt = new Date(lost.occurredAt).getTime()
      const foundAt = new Date(found.occurredAt).getTime()
      if (foundAt < lostAt - DAY || foundAt > lostAt + 60 * DAY) return false
      return distanceM(post.publicLocation, other.publicLocation) <= MAX_DISTANCE_M + post.radiusM + other.radiusM
    })
    .map((other) => {
      const [lost, found] = post.type === 'LOST' ? [post, other] : [other, post]
      return { post: other, ...scorePair(lost, found) }
    })
    .filter((c) => c.score.total >= MATCH_THRESHOLD)
    .sort((a, b) => b.score.total - a.score.total)
}
