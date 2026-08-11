import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './DistanceReadout.module.css'

type DistanceReadoutProps = {
  distanceMeters: number
}

/** Always-visible total route distance in kilometres (FR-006), summed from
 * the snapped segments actually drawn — never the straight-line distance
 * between waypoints (BR-002). Reads 0 km while the route has fewer than two
 * waypoints (BR-003), since `distanceMeters` is then 0.
 *
 * This is the answer the app exists to give, so it is drawn at display size —
 * the largest thing on the screen after the map itself — in the header bar the
 * app is operated from (`shared/layout/AppHeader`, docs/DESIGN.md).
 *
 * It is a live region: it names itself, and it announces each new total rather
 * than silently changing on screen. */
export function DistanceReadout({ distanceMeters }: DistanceReadoutProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()
  const km = distanceMeters === 0 ? '0' : (distanceMeters / 1000).toFixed(1)

  return (
    <div ref={ref} className={styles.figure} role="status">
      <span className={styles.label}>Total distance</span>{' '}
      {/* Keyed on the value so each new total is a new element, which is what
        * replays the entrance animation — a figure that changes without moving
        * is easy to miss on a screen with a map scrolling under it. */}
      <span key={km} className={styles.value} data-empty={distanceMeters === 0 || undefined}>
        <span className={styles.number}>{km}</span>{' '}
        <span className={styles.unit}>km</span>
      </span>
    </div>
  )
}
