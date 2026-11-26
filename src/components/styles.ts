import { twMerge } from 'tailwind-merge'

/** Une clases y resuelve conflictos de Tailwind (la última gana) */
export const cx = (...classes: (string | false | null | undefined)[]) => twMerge(classes.filter(Boolean).join(' '))

/** Tamaño y trazo únicos para todos los íconos de la interfaz */
export const icon = { size: 16, strokeWidth: 1.5, 'aria-hidden': true } as const

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] ' +
  'disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-fg shadow-sm hover:bg-raised',
  ghost: 'text-fg-2 hover:bg-raised hover:text-fg',
  danger: 'border border-line-strong bg-surface text-negative hover:bg-raised',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
}

export interface ButtonStyle {
  variant?: Variant
  size?: Size
}

export function buttonClass({ variant = 'primary', size = 'md' }: ButtonStyle = {}, extra?: string) {
  return cx(base, variants[variant], sizes[size], extra)
}

