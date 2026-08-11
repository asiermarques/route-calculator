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

function makeRoute(overrides: Partial<Parameters<typeof RouteLayer>[0]> = {}) {
  return {
    waypoints: [],
    path: [],
    isRouting: false,
    error: null,
    onAddWaypoint: vi.fn(),
    ...overrides,
  }
}

describe('RouteLayer', () => {
  it('adds a waypoint at the clicked location', () => {
    const route = makeRoute()
    render(<RouteLayer {...route} />)

    clickHandler!({ latlng: { lat: 40.4, lng: -3.7 } })

    expect(route.onAddWaypoint).toHaveBeenCalledWith({ lat: 40.4, lng: -3.7 })
  })

  it('renders no path when there are fewer than two connected points', () => {
    const route = makeRoute({ waypoints: [{ id: 'w1', lat: 40.4, lng: -3.7 }] })
    render(<RouteLayer {...route} />)

    expect(screen.queryByTestId('polyline')).not.toBeInTheDocument()
  })

  it('renders the snapped path as a polyline distinct from the waypoints', () => {
    const path = [
      { lat: 40.4, lng: -3.7 },
      { lat: 40.41, lng: -3.71 },
    ]
    const route = makeRoute({
      waypoints: [
        { id: 'w1', ...path[0] },
        { id: 'w2', ...path[1] },
      ],
      path,
    })
    render(<RouteLayer {...route} />)

    expect(polylineProps).toHaveBeenCalledWith(
      expect.objectContaining({ positions: [[40.4, -3.7], [40.41, -3.71]] }),
    )
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(2)

    const polylineColor = (polylineProps.mock.calls[0][0] as { pathOptions: { color: string } }).pathOptions.color
    const markerColor = (circleMarkerProps.mock.calls[0][0] as { pathOptions: { color: string } }).pathOptions.color
    expect(polylineColor).not.toBe(markerColor)
  })

  it('leaves the markers it already drew alone when a waypoint is added', () => {
    const first = { id: 'w1', lat: 40.4, lng: -3.7 }
    const { rerender } = render(<RouteLayer {...makeRoute({ waypoints: [first] })} />)
    circleMarkerProps.mockClear()

    rerender(<RouteLayer {...makeRoute({ waypoints: [first, { id: 'w2', lat: 40.41, lng: -3.71 }] })} />)

    // Only the new one is handed to Leaflet; the existing marker is untouched.
    expect(circleMarkerProps).toHaveBeenCalledTimes(1)
    expect(circleMarkerProps).toHaveBeenCalledWith(
      expect.objectContaining({ center: [40.41, -3.71] }),
    )
  })

  it('shows routing feedback while a segment is in flight', () => {
    render(<RouteLayer {...makeRoute({ isRouting: true })} />)

    expect(screen.getByText(/routing/i)).toBeInTheDocument()
  })

  it('shows an error message when routing fails', () => {
    render(<RouteLayer {...makeRoute({ error: 'Could not find a route to that point.' })} />)

    expect(screen.getByText(/could not find a route/i)).toBeInTheDocument()
  })

  it('keeps the same live region mounted from the start, so updates are announced', () => {
    const { rerender } = render(<RouteLayer {...makeRoute()} />)
    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()

    rerender(<RouteLayer {...makeRoute({ isRouting: true })} />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(/routing/i)

    rerender(<RouteLayer {...makeRoute({ error: 'Could not find a route.' })} />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(/could not find a route/i)
  })
})
