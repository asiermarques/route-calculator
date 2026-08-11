import { useCallback, useSyncExternalStore } from 'react'

const COARSE_POINTER = '(pointer: coarse)'

/** Whether the primary pointing device is imprecise — a finger rather than a
 * mouse. Waypoint markers are the one thing in this app sized in pixels rather
 * than by a stylesheet, so they can't answer this with a media query of their
 * own: Leaflet draws them from a radius passed in JavaScript.
 *
 * Subscribed to rather than read once, so a device that gains or loses a
 * mouse mid-session (a tablet docked to a keyboard) resizes its markers
 * instead of keeping whichever answer was true when the app loaded. */
export function useCoarsePointer(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const query = window.matchMedia(COARSE_POINTER)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE_POINTER).matches,
    // Server snapshot: this app never renders on a server, but Leaflet markers
    // are drawn for a real pointer, so the fine-pointer size is the honest
    // default for any environment that can't be asked.
    () => false,
  )
}
