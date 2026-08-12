import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { RoutingStatus } from './RoutingStatus'

/** "Routing…" is deferred until the request has been in flight long enough to
 * be worth saying (`usePendingIndicator`), so every assertion about it has to
 * get there first. The error is not deferred and needs none of this. */
function pastTheThreshold() {
  act(() => {
    vi.advanceTimersByTime(200)
  })
}

describe('RoutingStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows routing feedback while a segment is in flight', () => {
    render(<RoutingStatus isRouting error={null} />)
    pastTheThreshold()

    expect(screen.getByText(/routing/i)).toBeInTheDocument()
  })

  it('says nothing when the provider answers before a visitor could read it', () => {
    const { rerender } = render(<RoutingStatus isRouting error={null} />)

    act(() => {
      vi.advanceTimersByTime(80)
    })
    rerender(<RoutingStatus isRouting={false} error={null} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // The region is a row of the footer bar, so a message shown for two frames
    // grows the bar and shrinks it again — a flicker of the whole toolbar
    // rather than feedback (docs/DESIGN.md).
    expect(screen.queryByText(/routing/i)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows an error message when routing fails', () => {
    render(<RoutingStatus isRouting={false} error="Could not find a route to that point." />)

    // Not deferred: a failure is shown the moment it is known.
    expect(screen.getByText(/could not find a route/i)).toBeInTheDocument()
  })

  it('keeps the same live region mounted from the start, so updates are announced', () => {
    const { rerender } = render(<RoutingStatus isRouting={false} error={null} />)
    const region = screen.getByRole('status')
    // Empty, it is still in the tree — a live region inserted together with its
    // first message is announced unreliably — and still draws no panel.
    expect(region).toBeEmptyDOMElement()

    rerender(<RoutingStatus isRouting error={null} />)
    pastTheThreshold()
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(/routing/i)

    rerender(<RoutingStatus isRouting={false} error="Could not find a route." />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(/could not find a route/i)
  })
})
