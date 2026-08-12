import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MATCH_ZOOM } from '../shared/map/constants'
import { REQUEST_TIMEOUT_MS } from '../shared/http/fetchWithTimeout'
import { LOCATE_FAILURE_MESSAGE } from './geolocationFailure'

const setView = vi.fn()

vi.mock('react-leaflet', () => ({
  useMap: () => ({ setView }),
}))

const { LocateButton } = await import('./LocateButton')

/** Installs a `navigator.geolocation` stub for one test. jsdom has no
 * Geolocation API of its own, and the app must not assume there is one
 * (US-004) — every other test opts in explicitly. */
function stubGeolocation(impl: Partial<Geolocation>) {
  Object.defineProperty(window.navigator, 'geolocation', {
    value: impl,
    configurable: true,
  })
}

function removeGeolocation() {
  Object.defineProperty(window.navigator, 'geolocation', {
    value: undefined,
    configurable: true,
  })
}

function locateButton() {
  return screen.getByRole('button', { name: /locate/i })
}

/** Renders with a stub that resolves the mount-triggered automatic attempt
 * (below) immediately and invisibly, then swaps in `manual` for the press
 * that follows — the object `stubGeolocation` installed stays the same
 * object, so mutating its `getCurrentPosition` field is enough. Every test
 * about a *press* uses this, so it is testing the press and not the
 * automatic attempt every mount now also makes; `setView` is cleared
 * afterwards for the same reason. */
function renderPastAutoAttempt(manual: Geolocation['getCurrentPosition']) {
  const auto: Geolocation['getCurrentPosition'] = (success) =>
    (success as PositionCallback)({
      coords: { latitude: 0, longitude: 0 },
    } as GeolocationPosition)
  stubGeolocation({ getCurrentPosition: auto })
  const utils = render(<LocateButton />)
  ;(window.navigator.geolocation as Geolocation).getCurrentPosition = manual
  setView.mockClear()
  return utils
}

afterEach(() => {
  removeGeolocation()
  vi.useRealTimers()
})

describe('LocateButton — automatic locate on mount', () => {
  it("reads the visitor's position as soon as the control appears, with no press required", () => {
    stubGeolocation({
      getCurrentPosition: (success) =>
        (success as PositionCallback)({
          coords: { latitude: 40.4168, longitude: -3.7038 },
        } as GeolocationPosition),
    })

    render(<LocateButton />)

    expect(setView).toHaveBeenCalledWith([40.4168, -3.7038], MATCH_ZOOM)
  })

  it('fails silently on mount: no alert, and the map is left where it was', () => {
    stubGeolocation({
      getCurrentPosition: (_success, error) =>
        (error as PositionErrorCallback)({ code: 1, message: 'denied' } as GeolocationPositionError),
    })

    render(<LocateButton />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(setView).not.toHaveBeenCalled()
    expect(locateButton()).toBeEnabled()
  })

  it('gives up silently after the bounded wait when the automatic attempt never answers', async () => {
    vi.useFakeTimers()
    stubGeolocation({ getCurrentPosition: vi.fn() })

    render(<LocateButton />)
    await act(() => vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(setView).not.toHaveBeenCalled()
    expect(locateButton()).toBeEnabled()
  })

  it('makes only one automatic attempt — a re-render does not start a second one', () => {
    const getCurrentPosition = vi.fn()
    stubGeolocation({ getCurrentPosition })

    const { rerender } = render(<LocateButton />)
    rerender(<LocateButton />)

    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })
})

describe("LocateButton — reading the visitor's position via a press (US-001)", () => {
  it("centres the map at the address search's own zoom on a successful reading (FR-002, FR-003, ASM-001)", () => {
    renderPastAutoAttempt((success) =>
      (success as PositionCallback)({
        coords: { latitude: 40.4168, longitude: -3.7038 },
      } as GeolocationPosition),
    )

    fireEvent.click(locateButton())

    expect(setView).toHaveBeenCalledWith([40.4168, -3.7038], MATCH_ZOOM)
  })

  it('writes nothing to storage while locating or after a successful reading (BR-001)', () => {
    renderPastAutoAttempt((success) =>
      (success as PositionCallback)({
        coords: { latitude: 40.4168, longitude: -3.7038 },
      } as GeolocationPosition),
    )
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    fireEvent.click(locateButton())

    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('is keyboard-operable, and announces the in-flight state to assistive technology (FR-007)', async () => {
    let resolve!: (position: GeolocationPosition) => void
    renderPastAutoAttempt((success) => {
      resolve = success as PositionCallback
    })
    const user = userEvent.setup()

    await user.tab()
    expect(locateButton()).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent(/finding your position/i)
    resolve({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition)
  })

  it('starts no second reading while one is already in flight (FR-004, EDGE-006)', () => {
    const manual = vi.fn()
    renderPastAutoAttempt(manual)

    const button = locateButton()
    fireEvent.click(button)
    fireEvent.click(button)

    expect(manual).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(/finding your position/i)
  })
})

describe('LocateButton — a reading that cannot be delivered gives up (US-002)', () => {
  it('gives up after a bounded wait when the browser never answers, and leaves the map untouched (FR-005, EDGE-003)', async () => {
    renderPastAutoAttempt(vi.fn())
    vi.useFakeTimers()

    fireEvent.click(locateButton())
    await act(() => vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/too long/i)
    expect(setView).not.toHaveBeenCalled()
  })

  it('shows a browser refusal as an alert beside the control, without touching the map', () => {
    renderPastAutoAttempt((_success, error) =>
      (error as PositionErrorCallback)({ code: 1, message: 'denied' } as GeolocationPositionError),
    )

    fireEvent.click(locateButton())

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(setView).not.toHaveBeenCalled()
  })

  it('lets the visitor try again after a failure, requesting a fresh reading each time', () => {
    const manual = vi.fn((_success, error) =>
      (error as PositionErrorCallback)({ code: 2, message: 'unavailable' } as GeolocationPositionError),
    )
    renderPastAutoAttempt(manual)
    const button = locateButton()

    fireEvent.click(button)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(button)

    expect(manual).toHaveBeenCalledTimes(2)
  })

  it('ignores a reading that lands after the app has already given up on it', async () => {
    let resolve!: (position: GeolocationPosition) => void
    renderPastAutoAttempt((success) => {
      resolve = success as PositionCallback
    })
    vi.useFakeTimers()

    fireEvent.click(locateButton())
    await act(() => vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS))
    screen.getByRole('alert')

    // The browser finally answers, long after the app's own bounded wait
    // ended the attempt — a map that jumps seconds after a failure message
    // is worse than either outcome alone.
    resolve({ coords: { latitude: 40.4168, longitude: -3.7038 } } as GeolocationPosition)

    expect(setView).not.toHaveBeenCalled()
  })
})

describe('LocateButton — saying which failure it was (US-003)', () => {
  it('shows three different messages for a refusal, an unavailable position and a timeout', () => {
    const { unmount: unmountDenied } = renderPastAutoAttempt((_success, error) =>
      (error as PositionErrorCallback)({ code: 1, message: 'denied' } as GeolocationPositionError),
    )
    fireEvent.click(locateButton())
    expect(screen.getByRole('alert')).toHaveTextContent(LOCATE_FAILURE_MESSAGE.denied)
    unmountDenied()

    const { unmount: unmountUnavailable } = renderPastAutoAttempt((_success, error) =>
      (error as PositionErrorCallback)({ code: 2, message: 'unavailable' } as GeolocationPositionError),
    )
    fireEvent.click(locateButton())
    expect(screen.getByRole('alert')).toHaveTextContent(LOCATE_FAILURE_MESSAGE.unavailable)
    unmountUnavailable()

    renderPastAutoAttempt((_success, error) =>
      (error as PositionErrorCallback)({ code: 3, message: 'timeout' } as GeolocationPositionError),
    )
    fireEvent.click(locateButton())
    expect(screen.getByRole('alert')).toHaveTextContent(LOCATE_FAILURE_MESSAGE.timeout)
  })

  it('shows the refusal message again on a fifth press, unchanged, when the browser keeps refusing (FR-006)', () => {
    const manual = (_success: PositionCallback, error?: PositionErrorCallback | null) =>
      error?.({ code: 1, message: 'denied' } as GeolocationPositionError)
    renderPastAutoAttempt(manual)
    const button = locateButton()

    for (let press = 0; press < 5; press++) {
      fireEvent.click(button)
      expect(screen.getByRole('alert')).toHaveTextContent(LOCATE_FAILURE_MESSAGE.denied)
    }
  })

  it('falls back to the generic message for a failure code that is none of the three', () => {
    renderPastAutoAttempt((_success, error) =>
      (error as PositionErrorCallback)({ code: 99, message: 'unknown' } as GeolocationPositionError),
    )

    fireEvent.click(locateButton())

    expect(screen.getByRole('alert')).toHaveTextContent(LOCATE_FAILURE_MESSAGE.unreadable)
  })
})

describe('LocateButton — no control where the browser cannot locate (US-004)', () => {
  it('renders nothing when the browser exposes no Geolocation API', () => {
    removeGeolocation()

    render(<LocateButton />)

    expect(screen.queryByRole('button', { name: /locate/i })).not.toBeInTheDocument()
  })

  it('renders the control when the browser exposes a Geolocation API', () => {
    stubGeolocation({ getCurrentPosition: vi.fn() })

    render(<LocateButton />)

    expect(locateButton()).toBeInTheDocument()
  })
})
