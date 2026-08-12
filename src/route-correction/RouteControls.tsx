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
 * passed down as props, since slices don't import each other.
 *
 * The first control is labelled by what it does — remove the last waypoint —
 * rather than "Undo": since per-waypoint delete and move exist
 * (004-waypoint-edit-affordances) and neither is reversible, "Undo" would
 * wrongly imply it can reverse one (FR-015, BR-006). The *icon* beside it is
 * the conventional undo arrow, which carries exactly that implication — which
 * is why the label is the accessible name in both arrangements and the icon
 * never appears without it being one hover or one focus away (docs/DESIGN.md).
 *
 * Both the icon and the label are always in the DOM. The face of the button is
 * the icon in both of the footer's arrangements, and the label is a tooltip in
 * both — hidden with `opacity` and never removed from the accessibility tree,
 * so the button's accessible name stays the sentence on screen and there is no
 * `aria-label` to drift from it. The cost of a face without words is that touch
 * has no hover to reveal them; the gain is a phone footer of one row rather
 * than two (docs/DESIGN.md). */
export function RouteControls({ canUndo, canClear, onUndo, onClear }: RouteControlsProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()

  return (
    <div ref={ref} className={styles.controls} role="group" aria-label="Route corrections">
      <button className={styles.button} type="button" onClick={onUndo} disabled={!canUndo}>
        {/* Drawn, not an emoji or a font glyph, for the same reason as the key
          * in `ReopenCredentialsButton`: it inherits `currentColor` and so
          * takes the disabled and hover states with the rest of the button. */}
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3 9h11a5 5 0 0 1 0 10H8" />
          <path d="M7 5 3 9l4 4" />
        </svg>
        <span className={styles.label}>Remove last waypoint</span>
      </button>
      <button className={styles.button} type="button" onClick={onClear} disabled={!canClear}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 7h16" />
          <path d="M9.5 7V4.5h5V7" />
          <path d="M6.5 7 7.5 19.5h9L17.5 7" />
          <path d="M10.5 10.5v6M13.5 10.5v6" />
        </svg>
        <span className={styles.label}>Clear</span>
      </button>
    </div>
  )
}
