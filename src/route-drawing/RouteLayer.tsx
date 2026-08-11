import { memo, useMemo } from 'react'
import { CircleMarker, Polyline, useMapEvents } from 'react-leaflet'
import type { Waypoint } from './useRoute'
import type { LatLng } from '../shared/routing/types'
import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './RouteLayer.module.css'

type RouteLayerProps = {
  waypoints: Waypoint[]
  path: LatLng[]
  isRouting: boolean
  error: string | null
  onAddWaypoint: (point: LatLng) => void
}

const WAYPOINT_RADIUS = 6
const PATH_OPTIONS = { color: 'var(--color-route)', weight: 4 }
const WAYPOINT_OPTIONS = {
  color: 'var(--color-waypoint)',
  fillColor: 'var(--color-waypoint)',
  fillOpacity: 1,
}

/** One waypoint dot. Memoised on its coordinates so that adding the fiftieth
 * waypoint does not hand Leaflet a new position for the other forty-nine. */
const WaypointMarker = memo(function WaypointMarker({ lat, lng }: LatLng) {
  const center = useMemo((): [number, number] => [lat, lng], [lat, lng])

  return <CircleMarker center={center} radius={WAYPOINT_RADIUS} pathOptions={WAYPOINT_OPTIONS} />
})

/** Renders the route being drawn on the map: the snapped path and its
 * waypoints, styled distinctly from each other (FR-005), plus feedback while
 * a segment is being routed or after a failed one (UX requirement, FR-009).
 * Every map click adds a waypoint at the end of the route (FR-003). */
export function RouteLayer({ waypoints, path, isRouting, error, onAddWaypoint }: RouteLayerProps) {
  const statusRef = useDisableMapClickPropagation<HTMLDivElement>()

  // Stable across renders: react-leaflet keeps these in effect dependencies, so
  // a fresh object each render would detach and reattach the map's click
  // handler, and hand the polyline a new set of positions, on every state change.
  const handlers = useMemo(
    () => ({
      click(event: { latlng: { lat: number; lng: number } }) {
        onAddWaypoint({ lat: event.latlng.lat, lng: event.latlng.lng })
      },
    }),
    [onAddWaypoint],
  )
  const positions = useMemo(
    () => path.map((point): [number, number] => [point.lat, point.lng]),
    [path],
  )

  useMapEvents(handlers)

  return (
    <>
      {positions.length > 1 && <Polyline positions={positions} pathOptions={PATH_OPTIONS} />}
      {waypoints.map((waypoint) => (
        <WaypointMarker key={waypoint.id} lat={waypoint.lat} lng={waypoint.lng} />
      ))}
      {/* Mounted even with nothing to report, so assistive technology is
       * already observing the region when a message arrives — a live region
       * inserted together with its first message is announced unreliably.
       * Empty, it has no panel of its own: see `.status:not(:empty)`. */}
      <div ref={statusRef} className={styles.status} role="status">
        {isRouting && <span>Routing…</span>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </>
  )
}
