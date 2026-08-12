import type { ReactNode } from 'react'
import { useDisableMapClickPropagation } from '../map/useDisableMapClickPropagation'
import styles from './AppFooter.module.css'

type AppFooterProps = {
  /** Undo and clear (`route-correction`) — the leftmost tools. */
  corrections: ReactNode
  /** Anything that configures the app rather than the route, currently the way
   * back to the credentials screen (`credentials`). Sits at the end of the
   * same tool row: it is something the visitor *does* to the app, which is
   * what this bar is for. */
  settings: ReactNode
  /** What the routing provider is doing, or why it failed (`route-drawing`).
   * Spans a row above the tools when it has something to say and takes no
   * room — and no row — when it doesn't. In the rail it has no row to span, so
   * it becomes a pill hung off the side of the tools instead. */
  status: ReactNode
  /** Zooming the map (`shared/map`), at the far end — the second of the two
   * panels once the footer stops being a bar. */
  zoom: ReactNode
}

/** The toolbar half of the shell: everything that acts on the route or on the
 * app, along the bottom, the way `AppHeader` gathers everything that describes
 * the route along the top.
 *
 * Before this the same controls floated at different offsets in two different
 * corners, which is how a map app ends up looking like a pile of buttons
 * dropped on a map. Two bars and an untouched map between them is the whole
 * layout (docs/DESIGN.md).
 *
 * It is one full-width bar along the bottom while the screen is narrow enough
 * that a bar is the only thing that fits — a phone, and that is where it
 * stays — and stands up into a rail down the left edge once there is width to
 * spare, the two panels it is made of stacked one above the other. Both
 * arrangements come out of the same markup: the wrapper around the tools is
 * `display: contents` until it becomes a panel of its own, so a phone lays out
 * exactly as it did when the bar was flat.
 *
 * The status gets a slot of its own rather than sitting bare in the actions,
 * because the two arrangements need it in two different places — a row of the
 * panel in the bar, a pill beside the panel in the rail — and only the footer
 * knows which. The slot is `display: contents` in the bar, so the region is
 * still a direct flex item of the bar there and still takes itself out of flow
 * while it is empty, which is the thing that stops it opening a row
 * (docs/DESIGN.md). */
export function AppFooter({ corrections, settings, status, zoom }: AppFooterProps) {
  const ref = useDisableMapClickPropagation<HTMLElement>()

  return (
    <footer ref={ref} className={styles.footer}>
      <div className={styles.actions}>
        <div className={styles.statusSlot}>{status}</div>
        <div className={styles.tools}>
          {corrections}
          {settings}
        </div>
      </div>
      <div className={styles.zoom}>{zoom}</div>
    </footer>
  )
}
