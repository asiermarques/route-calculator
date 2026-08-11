import type { ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_CENTER, DEFAULT_ZOOM, OSM_ATTRIBUTION, OSM_TILE_URL } from './constants'
import styles from './MapView.module.css'

type MapViewProps = {
  children?: ReactNode
  /** Renders the map as scenery only: it is drawn, but nothing in it answers
   * a pointer, a key or a tab stop. Set while the credentials screen covers
   * the app (FR-001, US-005) — the map is behind that screen from the first
   * load, and being visible there must not make it reachable. */
  dormant?: boolean
}

/** The full-screen map. Owns the Leaflet instance; every slice that needs the
 * map renders inside it so it can reach the instance via react-leaflet's
 * `useMap`.
 *
 * The Leaflet instance is created once, for the life of the page, and is *not*
 * conditional on the app having credentials: the map is the backdrop the
 * credentials screen is shown over, so the same instance carries the visitor
 * from that screen into the app without a second one being built and a second
 * set of tiles fetched (docs/DESIGN.md). `dormant` is what keeps it scenery
 * until then, and is applied to a wrapper rather than to `MapContainer`:
 * Leaflet reads its own interaction options (`dragging`, `keyboard`, …) once,
 * at construction, so a map built without them would stay built without them
 * after the screen closes. */
export function MapView({ children, dormant = false }: MapViewProps) {
  return (
    // `inert` rather than `pointer-events: none`: the map keeps a tab stop of
    // its own (Leaflet sets `tabindex` on the container for its keyboard pan),
    // and a control the visitor can tab to behind a modal is as reachable as
    // one they can click.
    //
    // The dormant *class* has to go here too, rather than on `MapContainer`:
    // react-leaflet captures `className` on its first render and never applies
    // it again, so a class toggled on that element would be whatever it was
    // when the map was built and would never change back.
    <div className={dormant ? styles.dormant : undefined} inert={dormant}>
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
    </div>
  )
}
