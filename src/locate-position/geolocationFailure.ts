/** The three reasons a locate attempt can end without a position (FR-005,
 * EDGE-001, EDGE-002, EDGE-003), plus the catch-all for anything the browser
 * reports that isn't one of them. */
export const LOCATE_FAILURE_MESSAGE = {
  denied:
    "Location permission was refused. Allow it for this site in your browser's settings, then press this again.",
  unavailable: "Your position isn't available right now.",
  timeout: 'Finding your position took too long.',
  /** Also what a bare "the position could not be read" failure reads as
   * before it is known which of the three it was, and what any browser
   * failure code outside the three above falls back to (US-003 scope) —
   * silence is not an option for a live region already being watched. */
  unreadable: "Your position couldn't be read. Try again.",
} as const

// The W3C Geolocation spec's own numbering for `GeolocationPositionError.code`,
// restated rather than read off the `GeolocationPositionError` global: that
// constructor's static properties would be a runtime dependency on a browser
// API this module has no other reason to touch.
const PERMISSION_DENIED = 1
const POSITION_UNAVAILABLE = 2
const TIMEOUT = 3

/** Maps a `GeolocationPositionError`'s `code` to one of this app's own
 * failure messages (FR-005). The browser's own `message` string is never
 * read, let alone surfaced: it is neither stable across browsers nor written
 * for this app's visitors, and has been observed to carry a stray coordinate
 * in it — accepted here only so a real `GeolocationPositionError` can be
 * passed straight through, never inspected. */
export function describeGeolocationError(error: { code: number; message?: string }): string {
  switch (error.code) {
    case PERMISSION_DENIED:
      return LOCATE_FAILURE_MESSAGE.denied
    case POSITION_UNAVAILABLE:
      return LOCATE_FAILURE_MESSAGE.unavailable
    case TIMEOUT:
      return LOCATE_FAILURE_MESSAGE.timeout
    default:
      return LOCATE_FAILURE_MESSAGE.unreadable
  }
}
