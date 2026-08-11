import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoutingStatus } from './RoutingStatus'

describe('RoutingStatus', () => {
  it('shows routing feedback while a segment is in flight', () => {
    render(<RoutingStatus isRouting error={null} />)

    expect(screen.getByText(/routing/i)).toBeInTheDocument()
  })

  it('shows an error message when routing fails', () => {
    render(<RoutingStatus isRouting={false} error="Could not find a route to that point." />)

    expect(screen.getByText(/could not find a route/i)).toBeInTheDocument()
  })

  it('keeps the same live region mounted from the start, so updates are announced', () => {
    const { rerender } = render(<RoutingStatus isRouting={false} error={null} />)
    const region = screen.getByRole('status')
    // Empty, it is still in the tree — a live region inserted together with its
    // first message is announced unreliably — and still draws no panel.
    expect(region).toBeEmptyDOMElement()

    rerender(<RoutingStatus isRouting error={null} />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(/routing/i)

    rerender(<RoutingStatus isRouting={false} error="Could not find a route." />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(/could not find a route/i)
  })
})
