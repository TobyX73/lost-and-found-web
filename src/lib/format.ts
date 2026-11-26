const relative = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' })
const dayMonth = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
const dayMonthTime = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const monthYear = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
const decimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "hace 3 h", "ayer", "hace 5 días"; más de dos semanas pasa a fecha */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  if (abs < HOUR) return relative.format(Math.round(diff / MINUTE), 'minute')
  if (abs < DAY) return relative.format(Math.round(diff / HOUR), 'hour')
  if (abs < 14 * DAY) return relative.format(Math.round(diff / DAY), 'day')
  return dayMonth.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dayMonthTime.format(new Date(iso))
}

export function formatMonthYear(iso: string): string {
  return monthYear.format(new Date(iso))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`
  return `${decimal.format(meters / 1000)} km`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase()
}
