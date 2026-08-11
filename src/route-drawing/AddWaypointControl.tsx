import { useMap } from 'react-leaflet'
import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import type { LatLng } from '../shared/routing/types'
import styles from './AddWaypointControl.module.css'

type AddWaypointControlProps = {
  onAddWaypoint: (point: LatLng) => void
}

/** The keyboard way to place a waypoint (FR-003). Clicking the map is a
 * pointer-only gesture, which would leave the app's one job unreachable
 * without a mouse; Leaflet already pans and zooms from the keyboard, so
 * dropping a waypoint at the current centre completes the flow. */
export function AddWaypointControl({ onAddWaypoint }: AddWaypointControlProps) {
  const map = useMap()
  const ref = useDisableMapClickPropagation<HTMLDivElement>()

  function handleClick() {
    const centre = map.getCenter()
    onAddWaypoint({ lat: centre.lat, lng: centre.lng })
  }

  return (
    <div ref={ref} className={styles.control}>
      <button className={styles.button} type="button" onClick={handleClick}>
        Add waypoint at map centre
      </button>
    </div>
  )
}
