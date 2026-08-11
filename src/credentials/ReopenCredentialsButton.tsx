import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './ReopenCredentialsButton.module.css'

type ReopenCredentialsButtonProps = {
  onClick: () => void
}

/** Always-reachable way back to the credentials screen (US-005), so a
 * visitor who mistyped a key or picked the wrong provider can correct it
 * without reloading and losing the route they've drawn. A single-glyph
 * button, not a text label: it stacks below the distance readout in the
 * top-right corner (docs/DESIGN.md), and that column is only as wide as the
 * readout itself. */
export function ReopenCredentialsButton({ onClick }: ReopenCredentialsButtonProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()

  return (
    <div ref={ref} className={styles.control}>
      <button
        className={styles.button}
        type="button"
        onClick={onClick}
        aria-label="Change routing provider"
      >
        🔑
      </button>
    </div>
  )
}
