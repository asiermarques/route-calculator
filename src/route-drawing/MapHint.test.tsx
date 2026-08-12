import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { act, render, screen } from '@testing-library/react'
import { MapHint } from './MapHint'

/** Long enough to be past both timers in `MapHint` — the one that starts the
 * fade and the one that unmounts at the end of it. */
const PAST_ITS_WELCOME = 10_000

function coarsePointer(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('coarse') && matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('MapHint', () => {
  it('tells a visitor with an empty map that the map itself is the input', () => {
    render(<MapHint routeIsEmpty />)

    expect(screen.getByRole('status')).toHaveTextContent(/click the map to start your route/i)
  })

  it('asks for a tap rather than a click where the pointer is a finger', () => {
    coarsePointer(true)

    render(<MapHint routeIsEmpty />)

    expect(screen.getByRole('status')).toHaveTextContent(/tap the map/i)
  })

  it('goes away on its own after a few seconds, so it never becomes furniture', () => {
    vi.useFakeTimers()
    render(<MapHint routeIsEmpty />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(PAST_ITS_WELCOME)
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('is retired by the first waypoint, whether or not its time was up', () => {
    const { rerender } = render(<MapHint routeIsEmpty />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(<MapHint routeIsEmpty={false} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it.each([
    ['its time ran out', (rerender: (ui: ReactElement) => void) => {
      act(() => {
        vi.advanceTimersByTime(PAST_ITS_WELCOME)
      })
      rerender(<MapHint routeIsEmpty />)
    }],
    ['a waypoint retired it', (rerender: (ui: ReactElement) => void) => {
      rerender(<MapHint routeIsEmpty={false} />)
      rerender(<MapHint routeIsEmpty />)
    }],
  ])('does not come back once %s and the route is empty again', (_case, retire) => {
    vi.useFakeTimers()
    const { rerender } = render(<MapHint routeIsEmpty />)

    retire(rerender)

    // A visitor who has drawn and cleared a route knows how to draw one, and a
    // hint that reappears every time the map empties is an app arguing with
    // its user.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
