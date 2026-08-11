import type { ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_CENTER, DEFAULT_ZOOM, OSM_ATTRIBUTION, OSM_TILE_URL } from './constants'
import styles from './MapView.module.css'

type MapViewProps = {
  children?: ReactNode
}

/** The full-screen map. Owns the Leaflet instance; every slice that needs the
 * map renders inside it so it can reach the instance via react-leaflet's
 * `useMap`. */
export function MapView({ children }: MapViewProps) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className={styles.map}
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      {/* No `<ZoomControl>`: zooming is `shared/map/ZoomControls`, in the
        * footer bar with every other control, rather than a third-party widget
        * pinned to a corner at its own size (docs/DESIGN.md). */}
      {children}
    </MapContainer>
  )
}
