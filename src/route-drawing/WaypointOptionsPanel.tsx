import type { CSSProperties } from 'react'
import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './WaypointOptionsPanel.module.css'

type WaypointOptionsPanelProps = {
  style: CSSProperties
  onDelete: () => void
  onMove: () => void
}

/** Options for exactly one waypoint (FR-003, FR-004): delete it, or move it.
 * Anchored to the waypoint by the caller-supplied `style` (FR-014's marked
 * waypoint is what disambiguates two overlapping markers; anchoring alone
 * does not). Uses `useDisableMapClickPropagation` so pressing a button here
 * doesn't also reach Leaflet's own click handling and place a waypoint under
 * the panel. */
export function WaypointOptionsPanel({ style, onDelete, onMove }: WaypointOptionsPanelProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()

  return (
    <div ref={ref} className={styles.panel} style={style} role="group" aria-label="Waypoint options">
      <button className={styles.button} type="button" onClick={onDelete}>
        Delete
      </button>
      <button className={styles.button} type="button" onClick={onMove}>
        Move
      </button>
    </div>
  )
}
