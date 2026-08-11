import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './RoutingStatus.module.css'

type RoutingStatusProps = {
  isRouting: boolean
  error: string | null
}

/** What the routing provider is doing, or why it failed (FR-009): a segment
 * in flight, or the message from the one that didn't come back. Availability
 * is a normal operating condition here, not an exception
 * (docs/ARCHITECTURE.md), so this is a permanent part of the shell rather than
 * something that appears from nowhere.
 *
 * Mounted even with nothing to report, so assistive technology is already
 * observing the region when a message arrives — a live region inserted
 * together with its first message is announced unreliably. Empty, it has no
 * panel, no size, and no gap around it: see `.status:not(:empty)`. */
export function RoutingStatus({ isRouting, error }: RoutingStatusProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()

  return (
    <div ref={ref} className={styles.status} role="status">
      {isRouting && (
        <span className={styles.routing}>
          <span className={styles.pulse} aria-hidden="true" />
          Routing…
        </span>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
