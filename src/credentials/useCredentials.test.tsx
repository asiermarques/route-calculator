import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { OpenRouteServiceProvider } from '../shared/routing/openRouteServiceProvider'
import { MapboxDirectionsProvider } from '../shared/routing/mapboxDirectionsProvider'

const devRoutingProvider = vi.fn()
vi.mock('./devCredentials', () => ({ devRoutingProvider: () => devRoutingProvider() }))

const { useCredentials } = await import('./useCredentials')

describe('useCredentials', () => {
  it('has no routing provider when nothing is configured (FR-001)', () => {
    devRoutingProvider.mockReturnValue(null)

    const { result } = renderHook(() => useCredentials())

    expect(result.current.routingProvider).toBeNull()
  })

  it('starts configured from the development seed when one is present (US-002)', () => {
    const seeded = { getRoute: vi.fn() }
    devRoutingProvider.mockReturnValue(seeded)

    const { result } = renderHook(() => useCredentials())

    expect(result.current.routingProvider).toBe(seeded)
  })

  it('builds a routing provider from manually supplied credentials (US-001)', () => {
    devRoutingProvider.mockReturnValue(null)
    const { result } = renderHook(() => useCredentials())

    act(() => {
      result.current.setCredentials('mapbox', 'a-key')
    })

    expect(result.current.routingProvider).toBeInstanceOf(MapboxDirectionsProvider)
  })

  it('lets manually supplied credentials replace a development seed', () => {
    devRoutingProvider.mockReturnValue({ getRoute: vi.fn() })
    const { result } = renderHook(() => useCredentials())

    act(() => {
      result.current.setCredentials('openrouteservice', 'a-key')
    })

    expect(result.current.routingProvider).toBeInstanceOf(OpenRouteServiceProvider)
  })

  it('reports the screen open before any credentials exist, with no active provider (FR-001)', () => {
    devRoutingProvider.mockReturnValue(null)

    const { result } = renderHook(() => useCredentials())

    expect(result.current.isCredentialsScreenOpen).toBe(true)
    expect(result.current.activeProvider).toBeNull()
  })

  it('closes the screen and records the active provider once credentials are supplied (US-001)', () => {
    devRoutingProvider.mockReturnValue(null)
    const { result } = renderHook(() => useCredentials())

    act(() => {
      result.current.setCredentials('mapbox', 'a-key')
    })

    expect(result.current.isCredentialsScreenOpen).toBe(false)
    expect(result.current.activeProvider).toBe('mapbox')
  })

  it('reopens the screen on request without discarding the current routing provider (US-005)', () => {
    devRoutingProvider.mockReturnValue(null)
    const { result } = renderHook(() => useCredentials())
    act(() => {
      result.current.setCredentials('mapbox', 'a-key')
    })
    const provider = result.current.routingProvider

    act(() => {
      result.current.reopenCredentialsScreen()
    })

    expect(result.current.isCredentialsScreenOpen).toBe(true)
    expect(result.current.routingProvider).toBe(provider)
  })

  it('dismissing a reopened screen leaves the current credentials in place (US-005)', () => {
    devRoutingProvider.mockReturnValue(null)
    const { result } = renderHook(() => useCredentials())
    act(() => {
      result.current.setCredentials('mapbox', 'a-key')
    })
    const provider = result.current.routingProvider

    act(() => {
      result.current.reopenCredentialsScreen()
    })
    act(() => {
      result.current.dismissCredentialsScreen()
    })

    expect(result.current.isCredentialsScreenOpen).toBe(false)
    expect(result.current.routingProvider).toBe(provider)
  })

  it('supplying new credentials while reopened closes the screen and rebuilds the routing provider (US-005)', () => {
    devRoutingProvider.mockReturnValue(null)
    const { result } = renderHook(() => useCredentials())
    act(() => {
      result.current.setCredentials('openrouteservice', 'first-key')
    })
    act(() => {
      result.current.reopenCredentialsScreen()
    })

    act(() => {
      result.current.setCredentials('mapbox', 'second-key')
    })

    expect(result.current.isCredentialsScreenOpen).toBe(false)
    expect(result.current.activeProvider).toBe('mapbox')
    expect(result.current.routingProvider).toBeInstanceOf(MapboxDirectionsProvider)
  })
})
