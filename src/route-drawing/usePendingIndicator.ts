import { useEffect, useRef, useState } from 'react'

/** How long a segment has to be in flight before the app says so. Under this a
 * visitor could not have read the word anyway, and the cost of saying it is not
 * nothing: the status is a row of the footer bar, so a message that lasts two
 * frames grows the bar by 26px and shrinks it again — read as the whole toolbar
 * flickering rather than as feedback (docs/DESIGN.md). */
const APPEAR_AFTER_MS = 200

/** And once shown, the shortest time it stays. A message that arrives and
 * leaves inside a blink is worse than one never shown, and this one is a live
 * region as well: one that comes and goes within a frame is announced
 * erratically. */
const HOLD_FOR_MS = 400

/** Whether an in-progress state is worth *showing*, which is not the same
 * question as whether it is happening. Answers `false` for work that finishes
 * quickly, and keeps answering `true` for a short while after work that took
 * long enough to be announced.
 *
 * It deliberately knows nothing about routing: it is the display rule for a
 * pending flag, and the flag itself stays exactly as `useRoute` reports it. An
 * error is never passed through here — a failure is shown the moment it is
 * known. */
export function usePendingIndicator(isPending: boolean): boolean {
  const [isShown, setIsShown] = useState(false)
  const shownAt = useRef<number | null>(null)

  useEffect(() => {
    if (isPending) {
      // Already on screen: the hold below is what governs when it leaves, and
      // work starting again while it is held simply keeps it there.
      if (isShown) return

      const appear = setTimeout(() => {
        shownAt.current = Date.now()
        setIsShown(true)
      }, APPEAR_AFTER_MS)
      return () => clearTimeout(appear)
    }

    if (!isShown) return

    const heldFor = Date.now() - (shownAt.current ?? 0)
    const hide = setTimeout(
      () => {
        shownAt.current = null
        setIsShown(false)
      },
      Math.max(0, HOLD_FOR_MS - heldFor),
    )
    return () => clearTimeout(hide)
  }, [isPending, isShown])

  return isShown
}
