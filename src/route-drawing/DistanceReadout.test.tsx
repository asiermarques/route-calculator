import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DistanceReadout } from './DistanceReadout'

describe('DistanceReadout', () => {
  it('reads 0 km when the route is empty', () => {
    render(<DistanceReadout distanceMeters={0} />)

    expect(screen.getByText('0 km')).toBeInTheDocument()
  })

  it('shows the distance in kilometres, rounded to one decimal', () => {
    render(<DistanceReadout distanceMeters={2543} />)

    expect(screen.getByText('2.5 km')).toBeInTheDocument()
  })

  it('shows a fraction below one kilometre', () => {
    render(<DistanceReadout distanceMeters={420} />)

    expect(screen.getByText('0.4 km')).toBeInTheDocument()
  })

  it('announces the total, and says what the number is, for a screen reader', () => {
    render(<DistanceReadout distanceMeters={2543} />)

    // A live region, so a new total is spoken rather than only redrawn; the
    // figure carries its own label, since "2.5 km" alone says nothing.
    expect(screen.getByRole('status')).toHaveTextContent('Total distance: 2.5 km')
  })

  it('keeps announcing from the same region as the distance changes', () => {
    const { rerender } = render(<DistanceReadout distanceMeters={0} />)
    const region = screen.getByRole('status')

    rerender(<DistanceReadout distanceMeters={1200} />)

    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent('Total distance: 1.2 km')
  })
})
