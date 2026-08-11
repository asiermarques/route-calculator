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

vi.mock('./route-drawing/RouteLayer', () => ({
  RouteLayer: () => <div data-testid="route-layer" />,
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

const createRoutingProvider = vi.fn()
vi.mock('./shared/routing/config', () => ({
  createRoutingProvider: (...args: unknown[]) => createRoutingProvider(...args),
  RoutingConfigError: class RoutingConfigError extends Error {},
}))

const { default: App } = await import('./App')

describe('App', () => {
  it('renders the map screen with route drawing wired in when routing is configured', () => {
    createRoutingProvider.mockReturnValue({ getRoute: vi.fn() })
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

    expect(screen.getByTestId('map-view')).toBeInTheDocument()
    for (const testId of ['address-search-bar', 'route-layer', 'distance-readout', 'route-controls']) {
      expect(screen.getByTestId('map-view')).toContainElement(screen.getByTestId(testId))
    }
  })

  it('disables undo and clear while the route is empty, and enables them once it has waypoints', () => {
    createRoutingProvider.mockReturnValue({ getRoute: vi.fn() })
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

  it('wires undo and clear through to the route', async () => {
    createRoutingProvider.mockReturnValue({ getRoute: vi.fn() })
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
    await user.click(screen.getByRole('button', { name: /undo/i }))
    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(undo).toHaveBeenCalled()
    expect(clear).toHaveBeenCalled()
  })

  it('shows a clear startup error instead of the map when the routing configuration is invalid', () => {
    createRoutingProvider.mockImplementation(() => {
      throw new Error('Unknown routing provider "bogus". Set VITE_ROUTING_PROVIDER to one of: openrouteservice, mapbox.')
    })

    render(<App />)

    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument()
    expect(screen.getByText(/unknown routing provider/i)).toBeInTheDocument()
  })
})
