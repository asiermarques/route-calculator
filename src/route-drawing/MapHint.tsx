import { useEffect, useState } from 'react'
import { useCoarsePointer } from './useCoarsePointer'
import styles from './MapHint.module.css'

/** How long the hint stays up before it starts leaving, and how long it takes
 * to go. Long enough to be read twice at a glance, short enough that it is
 * gone before it becomes furniture. */
const HINT_MS = 5200
const FADE_MS = 420

type MapHintProps = {
  /** Whether nothing has been drawn yet. The hint answers exactly one
   * question — how do I start — so the first waypoint retires it, whether or
   * not its time was up. */
  routeIsEmpty: boolean
}

/** The one instruction the app needs and has nowhere to put: a route is drawn
 * by clicking the map, and an untouched map with two bars of controls around
 * it says nothing about the surface between them being the input.
 *
 * It is a hint and not a control: it takes no clicks (`pointer-events: none`
 * in the stylesheet, so a click aimed *through* it still places the waypoint
 * it is asking for), it can't be interacted with, and it leaves on its own —
 * which is what lets it float over the middle of the map without breaking the
 * rule that every control belongs in one of the two bars (docs/DESIGN.md).
 *
 * It goes away on the earlier of two events, and both matter: the timer, so a
 * visitor who ignores it isn't left with a label over their map, and the first
 * waypoint, so acting on it is what dismisses it. */
export function MapHint({ routeIsEmpty }: MapHintProps) {
  const isCoarsePointer = useCoarsePointer()
  const [phase, setPhase] = useState<'showing' | 'leaving' | 'gone'>('showing')

  // Two timers rather than an animation that ends by itself: the fade is
  // switched off under `prefers-reduced-motion`, and a lifetime measured by
  // `animationend` would never end for the visitor who asked for less motion.
  useEffect(() => {
    const leaving = window.setTimeout(() => setPhase('leaving'), HINT_MS)
    const gone = window.setTimeout(() => setPhase('gone'), HINT_MS + FADE_MS)
    return () => {
      window.clearTimeout(leaving)
      window.clearTimeout(gone)
    }
  }, [])

  // A waypoint doesn't hide the hint, it ends it: someone who has drawn a
  // route and then cleared it knows how to draw one, and a hint that comes
  // back every time the map empties is an app arguing with its user.
  useEffect(() => {
    if (!routeIsEmpty) setPhase('gone')
  }, [routeIsEmpty])

  if (phase === 'gone' || !routeIsEmpty) return null

  return (
    <div
      className={phase === 'leaving' ? `${styles.hint} ${styles.leaving}` : styles.hint}
      // Polite rather than assertive, and never focused: this is an offer, not
      // an event to interrupt for. It arrives with the app rather than during
      // it, so whether a screen reader speaks it as an update depends on the
      // reader — what the role guarantees is that it is reachable as its own
      // region rather than as a stray line of text on a map.
      role="status"
    >
      <p className={styles.pill}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          {/* The crosshair the map cursor already shows on a fine pointer —
            * the same mark, so the hint and the surface it describes are
            * visibly the same thing. */}
          <circle cx="12" cy="12" r="6.5" />
          <path d="M12 1.5 V6 M12 18 V22.5 M1.5 12 H6 M18 12 H22.5" />
        </svg>
        <span className={styles.lead}>
          {isCoarsePointer ? 'Tap' : 'Click'} the map to start your route
        </span>
        <span className={styles.note}>every point after it follows the streets</span>
      </p>
    </div>
  )
}
