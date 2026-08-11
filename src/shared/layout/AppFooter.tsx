import type { ReactNode } from 'react'
import { useDisableMapClickPropagation } from '../map/useDisableMapClickPropagation'
import styles from './AppFooter.module.css'

type AppFooterProps = {
  /** Placing a waypoint without a pointer (`route-drawing`). */
  add: ReactNode
  /** Undo and clear (`route-correction`). */
  corrections: ReactNode
  /** What the routing provider is doing, or why it failed (`route-drawing`).
   * Spans the bar when it has something to say and takes no room when it
   * doesn't. */
  status: ReactNode
  /** Zooming the map (`shared/map`), at the far end of the bar. */
  zoom: ReactNode
}

/** The other half of the shell: everything that acts on the route rather than
 * describing it, in one bar along the bottom, the way `AppHeader` gathers
 * everything that describes it along the top.
 *
 * Before this the same three controls floated at three different offsets in
 * two different corners, which is how a map app ends up looking like a pile of
 * buttons dropped on a map. Two bars and an untouched map between them is the
 * whole layout (docs/DESIGN.md).
 *
 * It spans the full width and sits above Leaflet's attribution strip, which is
 * the one thing left along the bottom edge and may not be covered. Zooming is
 * in here too (`shared/map/ZoomControls`) rather than in the corner Leaflet
 * would put it in, which is what lets the bar run edge to edge. */
export function AppFooter({ add, corrections, status, zoom }: AppFooterProps) {
  const ref = useDisableMapClickPropagation<HTMLElement>()

  return (
    <footer ref={ref} className={styles.footer}>
      {status}
      <div className={styles.add}>{add}</div>
      <div className={styles.corrections}>
        {corrections}
        {zoom}
      </div>
    </footer>
  )
}
