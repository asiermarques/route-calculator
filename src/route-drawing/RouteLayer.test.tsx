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
        // The dot's *fill* is what says which waypoint is marked (FR-014);
        // its stroke is the dark ring every waypoint wears to stay legible on
        // top of the route line, and is the same on all of them.
        data-color={(props.pathOptions as { fillColor: string }).fillColor}
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
    polylineProps.mockClear()
    render(<RouteLayer {...route} />)

    expect(polylineProps).toHaveBeenCalledWith(
      expect.objectContaining({ positions: [[40.4, -3.7], [40.41, -3.71]] }),
    )
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(2)

    // The route is two stacked lines, a dark casing under a bright core, so
    // that it reads over any map tile it crosses. The core is the route's own
    // colour, and it is that one a waypoint has to stay distinguishable from.
    const [casing, core] = polylineProps.mock.calls.map(
      (call) => (call[0] as { pathOptions: { color: string; weight: number } }).pathOptions,
    )
    expect(casing.weight).toBeGreaterThan(core.weight)
    // A waypoint is told apart from the route by two contrasts, not one: its
    // fill against the bright core, and its ring against the dark casing it
    // sits on top of. The fill is deliberately the casing's own dark colour —
    // that is what makes it stand out from the pale map tiles — so the ring is
    // what has to differ there.
    const marker = (circleMarkerProps.mock.calls[0][0] as {
      pathOptions: { fillColor: string; color: string }
    }).pathOptions
    expect(core.color).not.toBe(marker.fillColor)
    expect(casing.color).not.toBe(marker.color)
  })

  it('leaves both lines of the route inert, so a tap on one means a tap on the map', () => {
    const path = [
      { lat: 40.4, lng: -3.7 },
      { lat: 40.41, lng: -3.71 },
    ]
    polylineProps.mockClear()
    render(
      <RouteLayer
        {...makeRoute({
          waypoints: [
            { id: 'w1', ...path[0] },
            { id: 'w2', ...path[1] },
          ],
          path,
        })}
      />,
    )

    // The casing is drawn wider than the core, so an interactive casing would
    // reintroduce exactly the touch bug `interactive={false}` exists to fix:
    // a large tap target lying under every waypoint.
    expect(screen.getAllByTestId('polyline')).toHaveLength(2)
    for (const call of polylineProps.mock.calls) {
      expect(call[0]).toMatchObject({ interactive: false })
    }
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

  describe('waypoint size by pointer', () => {
    const w1 = { id: 'w1', lat: 40.4, lng: -3.7 }

    /** A `matchMedia` that answers `true` for exactly one query, so a test can
     * say which kind of pointer the device has without stubbing the shape of
     * `MediaQueryList` at every call site. */
    function stubPointer(matching: string) {
      const original = window.matchMedia
      window.matchMedia = ((query: string) =>
        ({
          ...original(query),
          matches: query === matching,
        }) as MediaQueryList) as typeof window.matchMedia
      return () => {
        window.matchMedia = original
      }
    }

    it('draws a waypoint big enough to hit with a finger on a touch device', () => {
      const restore = stubPointer('(pointer: coarse)')
      try {
        render(<RouteLayer {...makeRoute({ waypoints: [w1] })} />)

        const { radius } = circleMarkerProps.mock.calls.at(-1)![0]
        // A tap lands anywhere within a finger's contact patch, so the target
        // has to be far wider than the cursor hotspot a mouse aims with.
        expect(radius).toBeGreaterThanOrEqual(10)
      } finally {
        restore()
      }
    })

    it('draws the smaller waypoint when the pointer is a mouse', () => {
      render(<RouteLayer {...makeRoute({ waypoints: [w1] })} />)

      expect(circleMarkerProps.mock.calls.at(-1)![0].radius).toBe(7)
    })

    it('draws the marked waypoint larger than the rest, whatever the pointer', async () => {
      const user = userEvent.setup()
      render(<RouteLayer {...makeRoute({ waypoints: [w1, { id: 'w2', lat: 40.41, lng: -3.71 }] })} />)
      const resting = circleMarkerProps.mock.calls.at(-1)![0].radius

      await user.click(screen.getAllByTestId('circle-marker')[0])

      // Colour alone has to compete with a route line drawn in the same
      // weight class; size is the difference that survives a glance (FR-014).
      const marked = circleMarkerProps.mock.calls.at(-1)![0].radius
      expect(marked).toBeGreaterThan(resting)
    })

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
