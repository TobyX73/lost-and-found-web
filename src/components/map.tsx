import {
  Map as MapLibreMap,
  NavigationControl,
  type ExpressionSpecification,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Post } from '../features/posts/types'
import { boundsOf, circleRing, DEFAULT_CENTER, publicZoneRadius, type LatLng } from '../lib/geo'
import { useTheme, type Theme } from '../lib/theme'

// Vite pre-empaqueta maplibre y rompe la ruta relativa del worker: se la damos explícita
setWorkerUrl(workerUrl)

/** Estilos vectoriales de OpenFreeMap: datos de OpenStreetMap, sin API key */
const STYLE_URL: Record<Theme, string> = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

/** Mismos valores que --lost, --found y --accent-ink en index.css */
const ZONE_COLORS: Record<Theme, { lost: string; found: string; pick: string }> = {
  light: { lost: '#d9534f', found: '#2853c6', pick: '#2853c6' },
  dark: { lost: '#f07a72', found: '#7c9bf0', pick: '#8fa8f5' },
}

interface ZoneFeature {
  type: 'Feature'
  properties: Record<string, string | number>
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}
interface FeatureCollection {
  type: 'FeatureCollection'
  features: ZoneFeature[]
}

function zone(center: LatLng, radiusM: number, properties: Record<string, string | number>): ZoneFeature {
  return {
    type: 'Feature' as const,
    properties,
    geometry: { type: 'Polygon' as const, coordinates: [circleRing(center, radiusM)] },
  }
}

/**
 * Crea el mapa una vez y cambia el estilo cuando cambia el tema.
 * `onStyle` corre cada vez que hay un estilo nuevo cargado, para volver a agregar capas.
 */
function useMapLibre(
  container: RefObject<HTMLDivElement | null>,
  initial: { center: LatLng; zoom: number },
  onStyle: (map: MapLibreMap, theme: Theme) => void,
) {
  const { theme } = useTheme()
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)
  const onStyleRef = useRef(onStyle)
  const themeRef = useRef(theme)

  useEffect(() => {
    onStyleRef.current = onStyle
  })

  useEffect(() => {
    if (!container.current) return
    const map = new MapLibreMap({
      container: container.current,
      style: STYLE_URL[themeRef.current],
      center: [initial.center.lng, initial.center.lat],
      zoom: initial.zoom,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: false,
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.on('style.load', () => {
      onStyleRef.current(map, themeRef.current)
      setReady(true)
    })
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container.current)
    mapRef.current = map
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      setReady(false)
    }
    // El mapa se crea una sola vez: centro y zoom iniciales no lo recrean
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container])

  useEffect(() => {
    if (themeRef.current === theme) return
    themeRef.current = theme
    mapRef.current?.setStyle(STYLE_URL[theme])
  }, [theme])

  return { map: mapRef, ready, theme }
}

function addZoneLayers(map: MapLibreMap, colors: { lost: string; found: string }, data: FeatureCollection) {
  map.addSource('zones', { type: 'geojson', data })
  const color: ExpressionSpecification = ['match', ['get', 'type'], 'LOST', colors.lost, colors.found]
  map.addLayer({
    id: 'zones-fill',
    type: 'fill',
    source: 'zones',
    paint: {
      'fill-color': color,
      'fill-opacity': ['case', ['==', ['get', 'active'], 1], 0.28, 0.12],
    },
  })
  map.addLayer({
    id: 'zones-line',
    type: 'line',
    source: 'zones',
    paint: {
      'line-color': color,
      'line-width': ['case', ['==', ['get', 'active'], 1], 2, 1.25],
      'line-dasharray': [2, 1.5],
    },
  })
}

interface ZonesMapProps {
  posts: Post[]
  activeId?: string | null
  onSelect?: (id: string) => void
  /** Cuando cambia, el mapa se ajusta para mostrar todas las zonas */
  fitKey?: string
  className?: string
  /** Zoom máximo al ajustar, para no acercarse demasiado a una sola zona */
  maxZoom?: number
}

export function ZonesMap({ posts, activeId, onSelect, fitKey, className, maxZoom = 15 }: ZonesMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  const toData = (): FeatureCollection => ({
    type: 'FeatureCollection',
    features: posts
      // La zona activa va última para quedar arriba
      .toSorted((a, b) => Number(a.id === activeId) - Number(b.id === activeId))
      .map((p) =>
        zone(p.publicLocation, publicZoneRadius(p.radiusM), { id: p.id, type: p.type, active: p.id === activeId ? 1 : 0 }),
      ),
  })
  const dataRef = useRef(toData)
  useEffect(() => {
    dataRef.current = toData
  })

  const { map, ready } = useMapLibre(
    container,
    { center: posts[0]?.publicLocation ?? DEFAULT_CENTER, zoom: 12 },
    (m, theme) => {
      addZoneLayers(m, ZONE_COLORS[theme], dataRef.current())
      m.on('click', 'zones-fill', (event) => {
        const id = event.features?.at(-1)?.properties?.id
        if (typeof id === 'string') onSelectRef.current?.(id)
      })
      m.on('mouseenter', 'zones-fill', () => (m.getCanvas().style.cursor = 'pointer'))
      m.on('mouseleave', 'zones-fill', () => (m.getCanvas().style.cursor = ''))
    },
  )

  useEffect(() => {
    if (!ready) return
    ;(map.current?.getSource('zones') as GeoJSONSource | undefined)?.setData(dataRef.current())
  }, [ready, map, posts, activeId])

  useEffect(() => {
    if (!ready || !map.current) return
    const bounds = boundsOf(
      posts.map((p) => p.publicLocation),
      // Con una sola zona dejamos calles alrededor para que se entienda dónde queda
      Math.max(...posts.map((p) => publicZoneRadius(p.radiusM)), 300) * (posts.length === 1 ? 3 : 1),
    )
    if (bounds) map.current.fitBounds(bounds, { padding: 48, maxZoom, duration: 400 })
    // Solo se ajusta cuando cambia el conjunto de resultados, no en cada hover
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey])

  return <div ref={container} className={className} />
}

interface PickerMapProps {
  value: LatLng | null
  radiusM: number
  onChange: (value: LatLng) => void
  className?: string
}

/** Mapa para marcar dónde se perdió o encontró algo: un toque marca el centro de la zona */
export function PickerMap({ value, radiusM, onChange, className }: PickerMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const toData = (): FeatureCollection => ({
    type: 'FeatureCollection',
    features: value ? [zone(value, radiusM, { id: 'pick', type: 'FOUND', active: 1 })] : [],
  })
  const dataRef = useRef(toData)
  useEffect(() => {
    dataRef.current = toData
  })

  const { map, ready } = useMapLibre(container, { center: value ?? DEFAULT_CENTER, zoom: 13 }, (m, theme) => {
    const { pick } = ZONE_COLORS[theme]
    addZoneLayers(m, { lost: pick, found: pick }, dataRef.current())
    m.getCanvas().style.cursor = 'crosshair'
    m.on('click', (event) => onChangeRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng }))
  })

  useEffect(() => {
    if (!ready) return
    ;(map.current?.getSource('zones') as GeoJSONSource | undefined)?.setData(dataRef.current())
  }, [ready, map, value, radiusM])

  // Si el valor llega desde afuera (por ejemplo "usar mi ubicación"), centrar ahí
  const lastCentered = useRef<LatLng | null>(null)
  useEffect(() => {
    if (!ready || !value || !map.current) return
    if (lastCentered.current === null || Math.abs(lastCentered.current.lat - value.lat) > 0.01) {
      const bounds = boundsOf([value], radiusM * 2)
      if (bounds) map.current.fitBounds(bounds, { padding: 24, maxZoom: 15, duration: 400 })
    }
    lastCentered.current = value
  }, [ready, map, value, radiusM])

  return <div ref={container} className={className} />
}
