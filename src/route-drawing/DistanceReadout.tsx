import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import a11y from '../shared/design/a11y.module.css'
import styles from './DistanceReadout.module.css'

type DistanceReadoutProps = {
  distanceMeters: number
}

/** Always-visible total route distance in kilometres (FR-006), summed from
 * the snapped segments actually drawn — never the straight-line distance
 * between waypoints (BR-002). Reads 0 km while the route has fewer than two
 * waypoints (BR-003), since `distanceMeters` is then 0.
 *
 * This is the app's answer, so it is a live region: it names itself, and it
 * announces each new total rather than silently changing on screen. */
export function DistanceReadout({ distanceMeters }: DistanceReadoutProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()
  const km = distanceMeters === 0 ? '0' : (distanceMeters / 1000).toFixed(1)

  return (
    <div ref={ref} className={styles.readout} role="status">
      <span className={a11y.visuallyHidden}>Total distance: </span>
      <span>{km} km</span>
    </div>
  )
}
