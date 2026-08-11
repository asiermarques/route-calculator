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
})
