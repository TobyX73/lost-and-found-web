import {
  Backpack,
  IdCard,
  KeyRound,
  Package,
  PawPrint,
  Shirt,
  Smartphone,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Category, CategorySlug } from './types'

export const CATEGORIES: Category[] = [
  { id: 'c1', slug: 'documentos', name: 'Documentos' },
  { id: 'c2', slug: 'llaves', name: 'Llaves' },
  { id: 'c3', slug: 'billeteras', name: 'Billeteras' },
  { id: 'c4', slug: 'electronica', name: 'Electrónica' },
  { id: 'c5', slug: 'bolsos', name: 'Bolsos y mochilas' },
  { id: 'c6', slug: 'ropa', name: 'Ropa y accesorios' },
  { id: 'c7', slug: 'mascotas', name: 'Mascotas' },
  { id: 'c8', slug: 'otros', name: 'Otros' },
]

export const CATEGORY_ICONS: Record<CategorySlug, LucideIcon> = {
  documentos: IdCard,
  llaves: KeyRound,
  billeteras: Wallet,
  electronica: Smartphone,
  bolsos: Backpack,
  ropa: Shirt,
  mascotas: PawPrint,
  otros: Package,
}

export function categoryBySlug(slug: CategorySlug): Category {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[CATEGORIES.length - 1]
}
