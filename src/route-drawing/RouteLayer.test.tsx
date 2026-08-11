import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const polylineProps = vi.fn()
const circleMarkerProps = vi.fn()
let clickHandler: ((event: { latlng: { lat: number; lng: number } }) => void) | undefined

const mapContainer = document.createElement('div')
const mapMock = {
  latLngToContainerPoint: vi.fn(({ lat, lng }: { lat: number; lng: number }) => ({
    x: lat,
    y: lng,
  })),
  getSize: vi.fn(() => ({ x: 1000, y: 800 })),
  getContainer: vi.fn(() => mapContainer),
}

vi.mock('react-leaflet', () => ({
  useMap: () => mapMock,
  useMapEvents: (handlers: { click: (event: { latlng: { lat: number; lng: number } }) => void }) => {
    clickHandler = handlers.click
  },
  Polyline: (props: Record<string, unknown>) => {
    polylineProps(props)
    return <div data-testid="polyline" />
  },
  CircleMarker: (props: Record<string, unknown>) => {
    circleMarkerProps(props)
    const eventHandlers = props.eventHandlers as { click?: (event: unknown) => void } | undefined
    return (
      <button
        type="button"
        aria-label="waypoint marker"
        data-testid="circle-marker"
        data-color={(props.pathOptions as { color: string }).color}
        onClick={() => eventHandlers?.click?.({ originalEvent: { stopPropagation: vi.fn() } })}
      />
    )
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
    onDeleteWaypoint: vi.fn(),
    onMoveWaypoint: vi.fn(),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  mapContainer.style.cssText = ''
})

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
    const onDeleteWaypoint = vi.fn()
    const onMoveWaypoint = vi.fn()
    const { rerender } = render(
      <RouteLayer {...makeRoute({ waypoints: [first], onDeleteWaypoint, onMoveWaypoint })} />,
    )
    circleMarkerProps.mockClear()

    rerender(
      <RouteLayer
        {...makeRoute({
          waypoints: [first, { id: 'w2', lat: 40.41, lng: -3.71 }],
          onDeleteWaypoint,
          onMoveWaypoint,
        })}
      />,
    )

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

  describe('waypoint options (US-002)', () => {
    const w1 = { id: 'w1', lat: 40.4, lng: -3.7 }
    const w2 = { id: 'w2', lat: 40.41, lng: -3.71 }

    it('opens options for the clicked waypoint without adding a new one', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)

      await user.click(screen.getAllByTestId('circle-marker')[0])

      expect(screen.getByRole('group', { name: /waypoint options/i })).toBeInTheDocument()
      expect(route.onAddWaypoint).not.toHaveBeenCalled()
    })

    it('marks the waypoint whose options are open', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)

      await user.click(screen.getAllByTestId('circle-marker')[0])

      const markers = screen.getAllByTestId('circle-marker')
      expect(markers[0].dataset.color).toBe('var(--color-waypoint-selected)')
      expect(markers[1].dataset.color).toBe('var(--color-waypoint)')
    })

    it('at most one waypoint has options open: clicking another switches which one', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)

      await user.click(screen.getAllByTestId('circle-marker')[0])
      await user.click(screen.getAllByTestId('circle-marker')[1])

      expect(screen.getAllByRole('group', { name: /waypoint options/i })).toHaveLength(1)
      const markers = screen.getAllByTestId('circle-marker')
      expect(markers[0].dataset.color).toBe('var(--color-waypoint)')
      expect(markers[1].dataset.color).toBe('var(--color-waypoint-selected)')
    })

    it('closes without acting when the same waypoint is clicked again', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)

      await user.click(screen.getAllByTestId('circle-marker')[0])
      await user.click(screen.getAllByTestId('circle-marker')[0])

      expect(screen.queryByRole('group', { name: /waypoint options/i })).not.toBeInTheDocument()
      expect(route.onDeleteWaypoint).not.toHaveBeenCalled()
      expect(route.onMoveWaypoint).not.toHaveBeenCalled()
    })

    it('closes without acting on Escape, leaving the route untouched', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)
      await user.click(screen.getAllByTestId('circle-marker')[0])

      await user.keyboard('{Escape}')

      expect(screen.queryByRole('group', { name: /waypoint options/i })).not.toBeInTheDocument()
      expect(route.onAddWaypoint).not.toHaveBeenCalled()
    })

    it('closes when the map is clicked elsewhere, and places a waypoint there as usual', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)
      await user.click(screen.getAllByTestId('circle-marker')[0])

      act(() => clickHandler!({ latlng: { lat: 41, lng: -4 } }))

      expect(screen.queryByRole('group', { name: /waypoint options/i })).not.toBeInTheDocument()
      expect(route.onAddWaypoint).toHaveBeenCalledWith({ lat: 41, lng: -4 })
    })

    it('calls onDeleteWaypoint with the open waypoint id when Delete is pressed', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)
      await user.click(screen.getAllByTestId('circle-marker')[1])

      await user.click(screen.getByRole('button', { name: /delete/i }))

      expect(route.onDeleteWaypoint).toHaveBeenCalledWith('w2')
    })

    it('closes the options panel once Move is chosen, without adding a waypoint under the panel', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)
      await user.click(screen.getAllByTestId('circle-marker')[0])

      await user.click(screen.getByRole('button', { name: /move/i }))

      expect(screen.queryByRole('group', { name: /waypoint options/i })).not.toBeInTheDocument()
      expect(route.onAddWaypoint).not.toHaveBeenCalled()
    })
  })

  describe('armed move (US-004, US-005)', () => {
    const w1 = { id: 'w1', lat: 40.4, lng: -3.7 }
    const w2 = { id: 'w2', lat: 40.41, lng: -3.71 }

    async function armMove(route: ReturnType<typeof makeRoute>) {
      const user = userEvent.setup()
      render(<RouteLayer {...route} />)
      await user.click(screen.getAllByTestId('circle-marker')[0])
      await user.click(screen.getByRole('button', { name: /move/i }))
      return user
    }

    it('a map click while armed moves the waypoint instead of appending one', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      await armMove(route)

      act(() => clickHandler!({ latlng: { lat: 42, lng: -5 } }))

      expect(route.onMoveWaypoint).toHaveBeenCalledWith('w1', { lat: 42, lng: -5 })
      expect(route.onAddWaypoint).not.toHaveBeenCalled()
    })

    it('marks the armed waypoint, the same visual as an open options panel', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      await armMove(route)

      const markers = screen.getAllByTestId('circle-marker')
      expect(markers[0].dataset.color).toBe('var(--color-waypoint-selected)')
    })

    it('sets a distinct cursor on the map container while armed, clearing it once done', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      await armMove(route)

      expect(mapContainer.style.cursor).toBe('move')

      act(() => clickHandler!({ latlng: { lat: 42, lng: -5 } }))
      expect(mapContainer.style.cursor).toBe('')
    })

    it('clicking the armed waypoint again cancels the move, leaving the route untouched', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = await armMove(route)

      await user.click(screen.getAllByTestId('circle-marker')[0])

      expect(route.onMoveWaypoint).not.toHaveBeenCalled()
      expect(mapContainer.style.cursor).toBe('')
      act(() => clickHandler!({ latlng: { lat: 42, lng: -5 } }))
      expect(route.onAddWaypoint).toHaveBeenCalledWith({ lat: 42, lng: -5 })
    })

    it('Escape cancels an armed move, and the next map click appends a waypoint as usual', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = await armMove(route)

      await user.keyboard('{Escape}')

      expect(mapContainer.style.cursor).toBe('')
      act(() => clickHandler!({ latlng: { lat: 42, lng: -5 } }))
      expect(route.onAddWaypoint).toHaveBeenCalledWith({ lat: 42, lng: -5 })
      expect(route.onMoveWaypoint).not.toHaveBeenCalled()
    })

    it('clicking a different waypoint marker while armed commits the move to that spot', async () => {
      const route = makeRoute({ waypoints: [w1, w2] })
      const user = await armMove(route)

      await user.click(screen.getAllByTestId('circle-marker')[1])

      expect(route.onMoveWaypoint).toHaveBeenCalledWith('w1', { lat: w2.lat, lng: w2.lng })
    })

    it('the armed state disappears once the armed waypoint no longer exists in the route', async () => {
      const onAddWaypoint = vi.fn()
      const onMoveWaypoint = vi.fn()
      const { rerender } = render(
        <RouteLayer {...makeRoute({ waypoints: [w1, w2], onAddWaypoint, onMoveWaypoint })} />,
      )
      const user = userEvent.setup()
      await user.click(screen.getAllByTestId('circle-marker')[0])
      await user.click(screen.getByRole('button', { name: /move/i }))
      expect(mapContainer.style.cursor).toBe('move')

      // The waypoint is gone from the route (e.g. cleared, undone, or deleted).
      rerender(<RouteLayer {...makeRoute({ waypoints: [w2], onAddWaypoint, onMoveWaypoint })} />)

      expect(mapContainer.style.cursor).toBe('')
      act(() => clickHandler!({ latlng: { lat: 42, lng: -5 } }))
      expect(onAddWaypoint).toHaveBeenCalledWith({ lat: 42, lng: -5 })
      expect(onMoveWaypoint).not.toHaveBeenCalled()
    })
  })
})
