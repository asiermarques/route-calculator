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
        {/* A drawn key rather than the 🔑 emoji: an emoji is rendered by the
          * platform's own font, at its own colours, and lands as a small
          * coloured picture in the one corner of an otherwise monochrome
          * palette. This one inherits `currentColor` like every other glyph. */}
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
          <circle cx="8" cy="16" r="4.2" />
          <path d="M11 13 L20 4" />
          <path d="M17.2 6.8 L19.4 9" />
          <path d="M14.6 9.4 L16.8 11.6" />
        </svg>
      </button>
    </div>
  )
}
