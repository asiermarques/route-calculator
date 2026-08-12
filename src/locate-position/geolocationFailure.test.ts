import { describe, expect, it } from 'vitest'
import { describeGeolocationError, LOCATE_FAILURE_MESSAGE } from './geolocationFailure'

describe('describeGeolocationError', () => {
  it('names a refused permission without promising the app can ask again (FR-006, EDGE-001)', () => {
    const message = describeGeolocationError({ code: 1, message: 'User denied Geolocation' })

    expect(message).toMatch(/permission/i)
    expect(message).toMatch(/refused|denied/i)
    // Only the visitor can reverse a browser-level denial (in their own
    // browser settings) — the message must not read as the app offering to
    // re-prompt or retry on its own.
    expect(message).not.toMatch(/we('| wi)ll ask|automatically|on your behalf/i)
  })

  it('names an unavailable position distinctly from a refusal (EDGE-002)', () => {
    const unavailable = describeGeolocationError({ code: 2, message: 'Position unavailable' })
    const denied = describeGeolocationError({ code: 1, message: 'User denied Geolocation' })

    expect(unavailable).toMatch(/isn.t available|unavailable/i)
    expect(unavailable).not.toBe(denied)
  })

  it('names a timeout distinctly from the other two (EDGE-003)', () => {
    const timeout = describeGeolocationError({ code: 3, message: 'Timeout expired' })
    const denied = describeGeolocationError({ code: 1, message: 'User denied Geolocation' })
    const unavailable = describeGeolocationError({ code: 2, message: 'Position unavailable' })

    expect(timeout).toMatch(/too long/i)
    expect(timeout).not.toBe(denied)
    expect(timeout).not.toBe(unavailable)
    // The app's own bounded wait (US-002) has to land on the exact same
    // wording as the browser's own TIMEOUT code, since the visitor can't
    // tell which clock ran out and shouldn't be shown two vocabularies for
    // one outcome.
    expect(timeout).toBe(LOCATE_FAILURE_MESSAGE.timeout)
  })

  it('falls back to the generic message for a code none of the three (US-003 scope)', () => {
    const message = describeGeolocationError({ code: 99, message: 'anything' })

    expect(message).toBe(LOCATE_FAILURE_MESSAGE.unreadable)
  })

  it('never surfaces the browser-supplied message text, only the mapped copy (privacy/stability)', () => {
    const message = describeGeolocationError({
      code: 2,
      message: 'kCLErrorLocationUnknown at 40.4168,-3.7038',
    })

    expect(message).not.toContain('kCLErrorLocationUnknown')
    expect(message).not.toContain('40.4168')
  })
})
