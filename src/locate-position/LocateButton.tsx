import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import { MATCH_ZOOM } from '../shared/map/constants'
import { REQUEST_TIMEOUT_MS } from '../shared/http/fetchWithTimeout'
import { describeGeolocationError, LOCATE_FAILURE_MESSAGE } from './geolocationFailure'
import a11y from '../shared/design/a11y.module.css'
import styles from './LocateButton.module.css'

const ERROR_ID = 'locate-position-error'

type Status = { kind: 'idle' } | { kind: 'locating' } | { kind: 'error'; message: string }

/** Second way to position the map, beside the address search (005 FR-001): a
 * single reading from the browser's Geolocation API that centres the map at
 * the same zoom address search uses (ASM-001) and touches nothing about the
 * route (BR-002). Rendered only inside `RoutePlanner`, so it exists only once
 * credentials have been supplied, exactly as no other app control does.
 *
 * It also reads a position once on its own, the moment it appears — one
 * automatic attempt per page load, made silently (a failure leaves the map
 * exactly where it was, with nothing shown for it): the visitor can always
 * press the control themselves afterwards, and a press always speaks up about
 * how it went. `RoutePlanner`, and so this control, mounts exactly once per
 * load — credentials never re-arrive without a reload, and reopening the
 * credentials screen later (US-005 of `002`) does not remount it — so the
 * automatic attempt cannot repeat mid-session.
 *
 * Absent when the browser exposes no Geolocation API at all (US-004) — a
 * control that can only ever fail is worse than no control, and that absence
 * is decided once, here, by feature-detecting rather than by trying and
 * failing, so it never raises a permission prompt just to find out. */
export function LocateButton() {
  const map = useMap()
  const ref = useDisableMapClickPropagation<HTMLDivElement>()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  // One owner of the outcome per attempt: guards a callback — the browser's
  // own, or this component's bounded-wait timer — from acting on an attempt
  // the other one, or a cancelled effect (below), has already settled
  // (US-002 implementation notes). `true` between attempts and once one has
  // ended either way.
  const settledRef = useRef(true)

  const hasGeolocation = typeof navigator !== 'undefined' && Boolean(navigator.geolocation)

  /** One reading. `silent` is what tells the automatic attempt on mount apart
   * from a press: both centre the map on success, but only a press is allowed
   * to leave anything on screen when it fails — the visitor never asked the
   * automatic one for anything, so it has nothing to report back. */
  function attemptLocate(silent: boolean) {
    if (status.kind === 'locating') return

    settledRef.current = false
    setStatus({ kind: 'locating' })

    // Geolocation is a browser API, not a `fetch` — `fetchWithTimeout` is the
    // precedent for giving up rather than the mechanism to reuse, since there
    // is no `AbortController` for a pending `getCurrentPosition` call. This
    // timer is deliberately the *only* deadline in play: `getCurrentPosition`
    // is called with no `timeout` option of its own, so this is the one clock
    // that can end an attempt, and a late browser callback is always exactly
    // that — late (EDGE-003).
    const timer = setTimeout(() => {
      if (settledRef.current) return
      settledRef.current = true
      setStatus(silent ? { kind: 'idle' } : { kind: 'error', message: LOCATE_FAILURE_MESSAGE.timeout })
    }, REQUEST_TIMEOUT_MS)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer)
        if (settledRef.current) return
        settledRef.current = true
        map.setView([position.coords.latitude, position.coords.longitude], MATCH_ZOOM)
        setStatus({ kind: 'idle' })
      },
      (error) => {
        clearTimeout(timer)
        if (settledRef.current) return
        settledRef.current = true
        setStatus(silent ? { kind: 'idle' } : { kind: 'error', message: describeGeolocationError(error) })
      },
    )
  }

  // The one automatic attempt, made once when the control first appears. The
  // empty dependency array is deliberate: this must run on mount and never
  // again for the life of this component instance, matching "one automatic
  // attempt per load" above. The cleanup marks any attempt still in flight as
  // settled, so a callback that lands after this effect is torn down (an
  // unmount, or React's development-only double-invoke) can't act on a
  // component that has moved on.
  useEffect(() => {
    if (!hasGeolocation) return
    attemptLocate(true)
    return () => {
      settledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!hasGeolocation) return null

  const isLocating = status.kind === 'locating'
  const hasError = status.kind === 'error'

  return (
    <div ref={ref} className={styles.wrapper}>
      <button
        className={styles.button}
        type="button"
        onClick={() => attemptLocate(false)}
        disabled={isLocating}
        aria-describedby={hasError ? ERROR_ID : undefined}
      >
        {/* Drawn, not an emoji, for the same reason as every other icon in the
          * app: it inherits `currentColor` and so takes the hover and
          * disabled states with the rest of the button. A crosshair/target —
          * the conventional "locate me" mark. */}
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
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.5v3.5M12 18v3.5M2.5 12h3.5M18 12h3.5" />
        </svg>
        <span className={a11y.visuallyHidden}>Locate me</span>
      </button>
      {/* Progress lives in a region that is always mounted, so a screen
        * reader is already observing it when locating starts — the button's
        * own `disabled` state goes unannounced on its own, exactly as in
        * `AddressSearchBar`. Covers the automatic attempt too: it is silent
        * on failure, not invisible while it runs. */}
      <p className={a11y.visuallyHidden} role="status">
        {isLocating ? 'Finding your position…' : ''}
      </p>
      {hasError && (
        <p id={ERROR_ID} className={styles.message} role="alert">
          {status.message}
        </p>
      )}
    </div>
  )
}
