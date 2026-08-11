import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './RouteControls.module.css'

type RouteControlsProps = {
  canUndo: boolean
  canClear: boolean
  onUndo: () => void
  onClear: () => void
}

/** Always-reachable undo and clear controls (FR-007, FR-008), inert while
 * there is nothing to undo or clear (UX requirement). This slice owns the
 * controls only — the route state they act on is owned by route-drawing and
 * passed down as props, since slices don't import each other. */
export function RouteControls({ canUndo, canClear, onUndo, onClear }: RouteControlsProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()

  return (
    <div ref={ref} className={styles.controls} role="group" aria-label="Route corrections">
      <button className={styles.button} type="button" onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button className={styles.button} type="button" onClick={onClear} disabled={!canClear}>
        Clear
      </button>
    </div>
  )
}
