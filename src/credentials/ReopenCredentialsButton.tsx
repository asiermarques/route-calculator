import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './ReopenCredentialsButton.module.css'

type ReopenCredentialsButtonProps = {
  onClick: () => void
}

/** Always-reachable way back to the credentials screen (US-005), so a
 * visitor who mistyped a key or picked the wrong provider can correct it
 * without reloading and losing the route they've drawn. It sits at the end of
 * the footer's tool row, beside undo and clear (docs/DESIGN.md): changing the
 * provider is something the visitor does to the app, and the footer is the bar
 * things are done from — the header only reports.
 *
 * A single glyph rather than a text label, because it is the one control there
 * that isn't part of drawing a route: a third uppercase label would compete
 * with the two that are, and a phone's tool row has no width to give it. */
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
