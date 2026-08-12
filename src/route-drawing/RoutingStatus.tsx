import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import { usePendingIndicator } from './usePendingIndicator'
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
 * panel, no size, and no gap around it: see `.status:not(:empty)`.
 *
 * "Routing…" is held back until the request has been in flight long enough to
 * be worth saying, and then held on screen long enough to be read
 * (`usePendingIndicator`). A provider that answers in one frame would otherwise
 * open and close a row of the footer bar between two paints, which is a flicker
 * of the whole toolbar rather than feedback. The *error* is not deferred: a
 * failure is shown the moment it is known. */
export function RoutingStatus({ isRouting, error }: RoutingStatusProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()
  const showRouting = usePendingIndicator(isRouting)

  return (
    <div ref={ref} className={styles.status} role="status">
      {showRouting && (
        <span className={styles.routing}>
          <span className={styles.pulse} aria-hidden="true" />
          Routing…
        </span>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
