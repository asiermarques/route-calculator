import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const polylineProps = vi.fn()
const circleMarkerProps = vi.fn()
let clickHandler: ((event: { latlng: { lat: number; lng: number } }) => void) | undefined

vi.mock('react-leaflet', () => ({
  useMapEvents: (handlers: { click: (event: { latlng: { lat: number; lng: number } }) => void }) => {
    clickHandler = handlers.click
  },
  Polyline: (props: Record<string, unknown>) => {
    polylineProps(props)
    return <div data-testid="polyline" />
  },
  CircleMarker: (props: Record<string, unknown>) => {
    circleMarkerProps(props)
    return <div data-testid="circle-marker" />
  },
}))

const { RouteLayer } = await import('./RouteLayer')

function makeRoute(overrides: Partial<Parameters<typeof RouteLayer>[0]['route']> = {}) {
  return {
    waypoints: [],
    path: [],
    distanceMeters: 0,
    isRouting: false,
    error: null,
    addWaypoint: vi.fn(),
    undo: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  }
}

describe('RouteLayer', () => {
  it('adds a waypoint at the clicked location', () => {
    const route = makeRoute()
    render(<RouteLayer route={route} />)

    clickHandler!({ latlng: { lat: 40.4, lng: -3.7 } })

    expect(route.addWaypoint).toHaveBeenCalledWith({ lat: 40.4, lng: -3.7 })
  })

  it('renders no path when there are fewer than two connected points', () => {
    const route = makeRoute({ waypoints: [{ lat: 40.4, lng: -3.7 }] })
    render(<RouteLayer route={route} />)

    expect(screen.queryByTestId('polyline')).not.toBeInTheDocument()
  })

  it('renders the snapped path as a polyline distinct from the waypoints', () => {
    const path = [
      { lat: 40.4, lng: -3.7 },
      { lat: 40.41, lng: -3.71 },
    ]
    const route = makeRoute({ waypoints: [path[0], path[1]], path })
    render(<RouteLayer route={route} />)

    expect(polylineProps).toHaveBeenCalledWith(
      expect.objectContaining({ positions: [[40.4, -3.7], [40.41, -3.71]] }),
    )
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(2)

    const polylineColor = (polylineProps.mock.calls[0][0] as { pathOptions: { color: string } }).pathOptions.color
    const markerColor = (circleMarkerProps.mock.calls[0][0] as { pathOptions: { color: string } }).pathOptions.color
    expect(polylineColor).not.toBe(markerColor)
  })

  it('shows routing feedback while a segment is in flight', () => {
    const route = makeRoute({ isRouting: true })
    render(<RouteLayer route={route} />)

    expect(screen.getByText(/routing/i)).toBeInTheDocument()
  })

  it('shows an error message when routing fails', () => {
    const route = makeRoute({ error: 'Could not find a route to that point.' })
    render(<RouteLayer route={route} />)

    expect(screen.getByText(/could not find a route/i)).toBeInTheDocument()
  })
})
