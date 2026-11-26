/**
 * Tipos de publicaciones, alineados con el modelo de docs/ARCHITECTURE.md de la API (fase 2).
 * Mientras la API no los exponga, los sirve el mock de posts-api.ts.
 */
import type { LatLng } from '../../lib/geo'

export type PostType = 'LOST' | 'FOUND'
export type PostStatus = 'OPEN' | 'MATCHED' | 'RESOLVED' | 'EXPIRED'

export interface Category {
  id: string
  slug: CategorySlug
  name: string
}

export type CategorySlug =
  | 'documentos'
  | 'llaves'
  | 'billeteras'
  | 'electronica'
  | 'bolsos'
  | 'ropa'
  | 'mascotas'
  | 'otros'

/** Atributos normalizados en minúscula, como los guarda la API */
export interface PostAttributes {
  color?: string
  marca?: string
  modelo?: string
}

export interface PostAuthor {
  id: string
  displayName: string
}

export interface Post {
  id: string
  type: PostType
  title: string
  description: string
  category: Category
  attributes: PostAttributes
  occurredAt: string
  /** Ubicación ajustada a la grilla de ~300 m. La exacta nunca sale de la API */
  publicLocation: LatLng
  radiusM: number
  /**
   * Barrio para mostrar en listas. No está en el modelo todavía:
   * habría que resolverlo con geocoding inverso sobre public_location.
   */
  areaName?: string
  status: PostStatus
  author: PostAuthor
  createdAt: string
  /** Solo en FOUND. Las respuestas esperadas nunca se exponen */
  verificationQuestions?: { id: string; question: string }[]
}

export interface PostFilters {
  type?: PostType
  category?: CategorySlug
  q?: string
  /** Distancia máxima desde `near`, en metros */
  maxDistanceM?: number
  near?: LatLng
  authorId?: string
  includeClosed?: boolean
}

export interface CreatePostInput {
  type: PostType
  title: string
  description: string
  category: CategorySlug
  attributes: PostAttributes
  occurredAt: string
  /** Ubicación exacta: la API la guarda privada y publica la ajustada */
  location: LatLng
  radiusM: number
  verificationQuestions?: { question: string; expectedAnswer: string }[]
}

export interface MatchScore {
  total: number
  text: number
  distance: number
  date: number
  attributes: number
}

export interface MatchCandidate {
  post: Post
  score: MatchScore
  distanceM: number
}
