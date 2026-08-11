import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const getCenter = vi.fn()

vi.mock('react-leaflet', () => ({
  useMap: () => ({ getCenter }),
}))

const { AddWaypointControl } = await import('./AddWaypointControl')

describe('AddWaypointControl', () => {
  it('adds a waypoint at the current map centre', async () => {
    getCenter.mockReturnValue({ lat: 40.4168, lng: -3.7038 })
    const onAddWaypoint = vi.fn()
    const user = userEvent.setup()
    render(<AddWaypointControl onAddWaypoint={onAddWaypoint} />)

    await user.click(screen.getByRole('button', { name: /add waypoint at map centre/i }))

    expect(onAddWaypoint).toHaveBeenCalledWith({ lat: 40.4168, lng: -3.7038 })
  })

  it('places a waypoint from the keyboard alone, without a pointer', async () => {
    getCenter.mockReturnValue({ lat: 1, lng: 2 })
    const onAddWaypoint = vi.fn()
    const user = userEvent.setup()
    render(<AddWaypointControl onAddWaypoint={onAddWaypoint} />)

    await user.tab()
    expect(screen.getByRole('button', { name: /add waypoint at map centre/i })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onAddWaypoint).toHaveBeenCalledWith({ lat: 1, lng: 2 })
  })

  it('reads the centre at the moment it is pressed, not at render time', async () => {
    getCenter.mockReturnValue({ lat: 1, lng: 2 })
    const onAddWaypoint = vi.fn()
    const user = userEvent.setup()
    render(<AddWaypointControl onAddWaypoint={onAddWaypoint} />)

    // The user pans the map — Leaflet moves the view without re-rendering us.
    getCenter.mockReturnValue({ lat: 3, lng: 4 })
    await user.click(screen.getByRole('button', { name: /add waypoint at map centre/i }))

    expect(onAddWaypoint).toHaveBeenCalledWith({ lat: 3, lng: 4 })
  })
})
