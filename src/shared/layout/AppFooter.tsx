import type { ReactNode } from 'react'
import { useDisableMapClickPropagation } from '../map/useDisableMapClickPropagation'
import styles from './AppFooter.module.css'

type AppFooterProps = {
  /** Placing a waypoint without a pointer (`route-drawing`). */
  add: ReactNode
  /** Undo and clear (`route-correction`). */
  corrections: ReactNode
  /** What the routing provider is doing, or why it failed (`route-drawing`).
   * Spans a row above the actions when it has something to say and takes no
   * room when it doesn't. */
  status: ReactNode
  /** Zooming the map (`shared/map`), at the far end — the second panel of its
   * own once the footer splits. */
  zoom: ReactNode
}

/** The other half of the shell: everything that acts on the route rather than
 * describing it, along the bottom, the way `AppHeader` gathers everything that
 * describes it along the top.
 *
 * Before this the same three controls floated at three different offsets in
 * two different corners, which is how a map app ends up looking like a pile of
 * buttons dropped on a map. Two bars and an untouched map between them is the
 * whole layout (docs/DESIGN.md).
 *
 * It is one full-width bar while the screen is narrow enough that a bar is the
 * only thing that fits, and splits into two panels — the actions at one end,
 * zoom at the other — once there is width between them to leave the map
 * showing through. Both arrangements come out of the same markup: the wrapper
 * around the actions is `display: contents` until it becomes a panel of its
 * own, so a phone lays out exactly as it did when the bar was flat. */
export function AppFooter({ add, corrections, status, zoom }: AppFooterProps) {
  const ref = useDisableMapClickPropagation<HTMLElement>()

  return (
    <footer ref={ref} className={styles.footer}>
      <div className={styles.actions}>
        {status}
        <div className={styles.add}>{add}</div>
        <div className={styles.corrections}>{corrections}</div>
      </div>
      <div className={styles.zoom}>{zoom}</div>
    </footer>
  )
}
