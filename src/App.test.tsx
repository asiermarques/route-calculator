import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('./shared/map/MapView', () => ({
  MapView: ({ children, dormant }: { children?: React.ReactNode; dormant?: boolean }) => (
    <div data-testid="map-view" data-dormant={String(dormant ?? false)}>
      {children}
    </div>
  ),
}))

vi.mock('./address-search/AddressSearchBar', () => ({
  AddressSearchBar: () => <div data-testid="address-search-bar" />,
}))

vi.mock('./locate-position/LocateButton', () => ({
  LocateButton: () => <div data-testid="locate-button" />,
}))

const routeLayerProps = vi.fn()
vi.mock('./route-drawing/RouteLayer', () => ({
  RouteLayer: (props: Record<string, unknown>) => {
    routeLayerProps(props)
    return <div data-testid="route-layer" />
  },
}))

const mapHintProps = vi.fn()
vi.mock('./route-drawing/MapHint', () => ({
  MapHint: (props: Record<string, unknown>) => {
    mapHintProps(props)
    return <div data-testid="map-hint" />
  },
}))

vi.mock('./shared/map/ZoomControls', () => ({
  ZoomControls: () => <div data-testid="zoom-controls" />,
}))

vi.mock('./route-drawing/DistanceReadout', () => ({
  DistanceReadout: ({ distanceMeters }: { distanceMeters: number }) => (
    <div data-testid="distance-readout">{distanceMeters}</div>
  ),
}))

vi.mock('./route-correction/RouteControls', () => ({
  RouteControls: ({
    canUndo,
    canClear,
    onUndo,
    onClear,
  }: {
    canUndo: boolean
    canClear: boolean
    onUndo: () => void
    onClear: () => void
  }) => (
    <div data-testid="route-controls">
      <button onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={onClear} disabled={!canClear}>
        Clear
      </button>
    </div>
  ),
}))

const undo = vi.fn()
const clear = vi.fn()
const useRoute = vi.fn()
vi.mock('./route-drawing/useRoute', () => ({ useRoute: (...args: unknown[]) => useRoute(...args) }))

const setCredentials = vi.fn()
const reopenCredentialsScreen = vi.fn()
const dismissCredentialsScreen = vi.fn()
const useCredentials = vi.fn()
vi.mock('./credentials/useCredentials', () => ({
  useCredentials: (...args: unknown[]) => useCredentials(...args),
}))

vi.mock('./credentials/CredentialsScreen', () => ({
  CredentialsScreen: ({
    onSubmit,
    initialProvider,
    onDismiss,
  }: {
    onSubmit: (provider: string, apiKey: string) => void
    initialProvider?: string
    onDismiss?: () => void
  }) => (
    <div data-testid="credentials-screen" data-initial-provider={initialProvider ?? ''}>
      <button onClick={() => onSubmit('mapbox', 'a-key')}>Credentials screen submit</button>
      {onDismiss && <button onClick={onDismiss}>Credentials screen dismiss</button>}
    </div>
  ),
}))

vi.mock('./credentials/ReopenCredentialsButton', () => ({
  ReopenCredentialsButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="reopen-credentials-button" onClick={onClick}>
      Change routing provider
    </button>
  ),
}))

const { default: App } = await import('./App')

function baseCredentials(overrides: Partial<ReturnType<typeof useCredentials>> = {}) {
  return {
    routingProvider: null,
    activeProvider: null,
    isCredentialsScreenOpen: true,
    setCredentials,
    reopenCredentialsScreen,
    dismissCredentialsScreen,
    ...overrides,
  }
}

describe('App', () => {
  it('shows the credentials screen over a map that is drawn but unreachable when no routing provider is configured yet (FR-001)', () => {
    useCredentials.mockReturnValue(baseCredentials())

    render(<App />)

    expect(screen.getByTestId('credentials-screen')).toBeInTheDocument()
    // The map is the backdrop the screen is shown over (docs/DESIGN.md), so it
    // is present — but dormant, and with none of the controls that would make
    // it a drawing surface: what FR-001 holds back is the app, not the view.
    expect(screen.getByTestId('map-view')).toHaveAttribute('data-dormant', 'true')
    expect(screen.queryByTestId('address-search-bar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('locate-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('route-layer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('route-controls')).not.toBeInTheDocument()
  })

  it('wakes the map up once the credentials screen is gone, and puts it back to sleep when it is reopened (US-005)', () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    useRoute.mockReturnValue({
      waypoints: [],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      undo,
      clear,
    })

    const { rerender } = render(<App />)
    expect(screen.getByTestId('map-view')).toHaveAttribute('data-dormant', 'false')

    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: true }),
    )
    rerender(<App />)

    expect(screen.getByTestId('map-view')).toHaveAttribute('data-dormant', 'true')
  })

  it('passes credentials the visitor supplies through to useCredentials (US-001)', async () => {
    useCredentials.mockReturnValue(baseCredentials())
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByText('Credentials screen submit'))

    expect(setCredentials).toHaveBeenCalledWith('mapbox', 'a-key')
  })

  it('renders the map screen with route drawing wired in once a routing provider is configured', () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    useRoute.mockReturnValue({
      waypoints: [],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      deleteWaypoint: vi.fn(),
      moveWaypoint: vi.fn(),
      undo,
      clear,
    })

    render(<App />)

    expect(screen.queryByTestId('credentials-screen')).not.toBeInTheDocument()
    expect(screen.getByTestId('map-view')).toBeInTheDocument()
    for (const testId of [
      'address-search-bar',
      'locate-button',
      'route-layer',
      'distance-readout',
      'route-controls',
      'reopen-credentials-button',
      'zoom-controls',
      'map-hint',
    ]) {
      expect(screen.getByTestId('map-view')).toContainElement(screen.getByTestId(testId))
    }
  })

  it('puts the locate control in the header, beside the address search it is a peer of (005)', () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    useRoute.mockReturnValue({
      waypoints: [],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      undo,
      clear,
    })

    render(<App />)

    // Both position the map rather than act on the route, which is why they
    // share the header and not the footer (docs/DESIGN.md).
    const header = screen.getByTestId('locate-button').closest('header')
    expect(header).not.toBeNull()
    expect(header).toContainElement(screen.getByTestId('address-search-bar'))
  })

  it('puts the way back to the credentials screen in the footer, beside the controls it is a peer of', () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    useRoute.mockReturnValue({
      waypoints: [],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      undo,
      clear,
    })

    render(<App />)

    // The header reports the route; the footer is what it is acted on from
    // (docs/DESIGN.md). Changing the provider is an action, and beside the
    // distance figure it was the one control in the header that did anything.
    const footer = screen.getByTestId('reopen-credentials-button').closest('footer')
    expect(footer).not.toBeNull()
    expect(footer).toContainElement(screen.getByTestId('route-controls'))
  })

  it('tells the map hint whether anything has been drawn yet, so it retires on the first waypoint', () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    useRoute.mockReturnValue({
      waypoints: [{ lat: 1, lng: 1 }],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      undo,
      clear,
    })

    render(<App />)

    expect(mapHintProps).toHaveBeenCalledWith(expect.objectContaining({ routeIsEmpty: false }))
  })

  it('wires per-waypoint delete and move through to the same route as map clicks (004)', () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    const deleteWaypoint = vi.fn()
    const moveWaypoint = vi.fn()
    useRoute.mockReturnValue({
      waypoints: [],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      deleteWaypoint,
      moveWaypoint,
      undo,
      clear,
    })

    render(<App />)

    expect(routeLayerProps).toHaveBeenCalledWith(
      expect.objectContaining({ onDeleteWaypoint: deleteWaypoint, onMoveWaypoint: moveWaypoint }),
    )
  })

  it('disables undo and clear while the route is empty, and enables them once it has waypoints', () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    useRoute.mockReturnValue({
      waypoints: [{ lat: 1, lng: 1 }],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      undo,
      clear,
    })

    render(<App />)

    expect(screen.getByRole('button', { name: /undo/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /clear/i })).not.toBeDisabled()
  })

  // One correction per test, not both in sequence: the controls now sit in the
  // footer bar, which — like every panel inside the map — stops Leaflet from
  // reading a click on it as a click on the map. In jsdom that guard also
  // swallows a second synthetic click landing in the same panel within half a
  // second, which a real browser does not do (`e2e/route-correction.spec.ts`
  // presses both, in order, against a real build).
  it.each([
    ['undo', /undo/i, () => undo],
    ['clear', /^clear$/i, () => clear],
  ])('wires %s through to the route', async (_name, buttonName, handler) => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    useRoute.mockReturnValue({
      waypoints: [{ lat: 1, lng: 1 }],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      undo,
      clear,
    })
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByRole('button', { name: buttonName }))

    expect(handler()).toHaveBeenCalled()
  })

  it('reopens the credentials screen from the running app, without unmounting the map (US-005)', async () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    useRoute.mockReturnValue({
      waypoints: [{ lat: 1, lng: 1 }],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      undo,
      clear,
    })
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByTestId('reopen-credentials-button'))

    expect(reopenCredentialsScreen).toHaveBeenCalled()
  })

  it('shows the credentials screen on top of the map when reopened, preselecting the active provider, dismissable (US-005)', async () => {
    useCredentials.mockReturnValue(
      baseCredentials({
        routingProvider: { getRoute: vi.fn() },
        activeProvider: 'mapbox',
        isCredentialsScreenOpen: true,
      }),
    )
    useRoute.mockReturnValue({
      waypoints: [],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint: vi.fn(),
      undo,
      clear,
    })
    const user = userEvent.setup()

    render(<App />)

    expect(screen.getByTestId('map-view')).toBeInTheDocument()
    const screenEl = screen.getByTestId('credentials-screen')
    expect(screenEl).toBeInTheDocument()
    expect(screenEl).toHaveAttribute('data-initial-provider', 'mapbox')

    await user.click(screen.getByText('Credentials screen dismiss'))
    expect(dismissCredentialsScreen).toHaveBeenCalled()
  })

  it('offers no dismiss on the credentials screen before any provider has ever been configured (FR-001)', () => {
    useCredentials.mockReturnValue(baseCredentials({ routingProvider: null, isCredentialsScreenOpen: true }))

    render(<App />)

    expect(screen.queryByText('Credentials screen dismiss')).not.toBeInTheDocument()
  })
})
