export interface LatLng {
  lat: number
  lng: number
}

/** Obelisco, centro por defecto mientras no tengamos la ubicación de la persona */
export const DEFAULT_CENTER: LatLng = { lat: -34.6037, lng: -58.3816 }

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180

export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/**
 * La API publica la ubicación ajustada a una grilla de ~300 m.
 * La zona que mostramos cubre esa grilla y el radio que declaró la persona.
 */
export const PUBLIC_GRID_M = 300

export function publicZoneRadius(radiusM: number): number {
  return Math.max(PUBLIC_GRID_M, radiusM)
}

/** Anillo de un círculo geográfico en [lng, lat], para dibujarlo en el mapa */
export function circleRing(center: LatLng, radiusM: number, steps = 64): [number, number][] {
  const ring: [number, number][] = []
  const latDeg = radiusM / 111_320
  const lngDeg = radiusM / (111_320 * Math.cos(toRad(center.lat)))
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    ring.push([center.lng + lngDeg * Math.cos(angle), center.lat + latDeg * Math.sin(angle)])
  }
  return ring
}

export function boundsOf(points: LatLng[], paddingM = 0): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }
  const padLat = paddingM / 111_320
  const padLng = paddingM / (111_320 * Math.cos(toRad((minLat + maxLat) / 2)))
  return [
    [minLng - padLng, minLat - padLat],
    [maxLng + padLng, maxLat + padLat],
  ]
}
