import { CircleMarker, Polyline, useMapEvents } from 'react-leaflet'
import type { RouteApi } from './useRoute'
import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './RouteLayer.module.css'

type RouteLayerProps = {
  route: RouteApi
}

const WAYPOINT_RADIUS = 6

/** Renders the route being drawn on the map: the snapped path and its
 * waypoints, styled distinctly from each other (FR-005), plus feedback while
 * a segment is being routed or after a failed one (UX requirement, FR-009).
 * Every map click adds a waypoint at the end of the route (FR-003). */
export function RouteLayer({ route }: RouteLayerProps) {
  const statusRef = useDisableMapClickPropagation<HTMLDivElement>()

  useMapEvents({
    click(event) {
      route.addWaypoint({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return (
    <>
      {route.path.length > 1 && (
        <Polyline
          positions={route.path.map((point) => [point.lat, point.lng])}
          pathOptions={{ color: 'var(--color-route)', weight: 4 }}
        />
      )}
      {route.waypoints.map((waypoint, index) => (
        <CircleMarker
          key={`${waypoint.lat},${waypoint.lng},${index}`}
          center={[waypoint.lat, waypoint.lng]}
          radius={WAYPOINT_RADIUS}
          pathOptions={{
            color: 'var(--color-waypoint)',
            fillColor: 'var(--color-waypoint)',
            fillOpacity: 1,
          }}
        />
      ))}
      {(route.isRouting || route.error) && (
        <div ref={statusRef} className={styles.status}>
          {route.isRouting && <span>Routing…</span>}
          {route.error && <p className={styles.error}>{route.error}</p>}
        </div>
      )}
    </>
  )
}
