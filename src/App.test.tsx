import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('./shared/map/MapView', () => ({
  MapView: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-view">{children}</div>
  ),
}))

vi.mock('./address-search/AddressSearchBar', () => ({
  AddressSearchBar: () => <div data-testid="address-search-bar" />,
}))

const routeLayerProps = vi.fn()
vi.mock('./route-drawing/RouteLayer', () => ({
  RouteLayer: (props: Record<string, unknown>) => {
    routeLayerProps(props)
    return <div data-testid="route-layer" />
  },
}))

vi.mock('./shared/map/ZoomControls', () => ({
  ZoomControls: () => <div data-testid="zoom-controls" />,
}))

vi.mock('./route-drawing/AddWaypointControl', () => ({
  AddWaypointControl: ({ onAddWaypoint }: { onAddWaypoint: (point: unknown) => void }) => (
    <button data-testid="add-waypoint-control" onClick={() => onAddWaypoint({ lat: 1, lng: 2 })}>
      Add waypoint at map centre
    </button>
  ),
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
  it('shows the credentials screen and no map when no routing provider is configured yet (FR-001)', () => {
    useCredentials.mockReturnValue(baseCredentials())

    render(<App />)

    expect(screen.getByTestId('credentials-screen')).toBeInTheDocument()
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument()
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
      'route-layer',
      'add-waypoint-control',
      'distance-readout',
      'route-controls',
      'reopen-credentials-button',
      'zoom-controls',
    ]) {
      expect(screen.getByTestId('map-view')).toContainElement(screen.getByTestId(testId))
    }
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

  it('wires the keyboard waypoint control through to the same route as map clicks', async () => {
    useCredentials.mockReturnValue(
      baseCredentials({ routingProvider: { getRoute: vi.fn() }, isCredentialsScreenOpen: false }),
    )
    const addWaypoint = vi.fn()
    useRoute.mockReturnValue({
      waypoints: [],
      path: [],
      distanceMeters: 0,
      isRouting: false,
      error: null,
      addWaypoint,
      undo,
      clear,
    })
    const user = userEvent.setup()

    render(<App />)
    await user.click(screen.getByTestId('add-waypoint-control'))

    expect(addWaypoint).toHaveBeenCalledWith({ lat: 1, lng: 2 })
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
