import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRoute } from './useRoute'
import type { RoutingProvider } from '../shared/routing/types'

const A = { lat: 40.41, lng: -3.7 }
const B = { lat: 40.42, lng: -3.71 }
const C = { lat: 40.43, lng: -3.72 }

function segmentBetween(from: typeof A, to: typeof A, distanceMeters: number) {
  return { path: [from, to], distanceMeters }
}

describe('useRoute', () => {
  it('starts empty: no waypoints, no path, 0 distance', () => {
    const provider: RoutingProvider = { getRoute: vi.fn() }
    const { result } = renderHook(() => useRoute(provider))

    expect(result.current.waypoints).toEqual([])
    expect(result.current.path).toEqual([])
    expect(result.current.distanceMeters).toBe(0)
  })

  it('adds a single waypoint on the first click without routing anything', () => {
    const getRoute = vi.fn()
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))

    expect(result.current.waypoints).toEqual([A])
    expect(result.current.path).toEqual([])
    expect(result.current.distanceMeters).toBe(0)
    expect(getRoute).not.toHaveBeenCalled()
  })

  it('routes and appends the segment when a second waypoint is added', async () => {
    const getRoute = vi.fn().mockResolvedValue(segmentBetween(A, B, 1000))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))

    await waitFor(() => expect(getRoute).toHaveBeenCalledWith(A, B))
    await waitFor(() => expect(result.current.isRouting).toBe(false))
    expect(result.current.distanceMeters).toBe(1000)
    expect(result.current.path).toEqual([A, B])
    expect(result.current.waypoints).toEqual([A, B])
  })

  it('appends a further segment to the end when a third waypoint is added', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1500))

    expect(result.current.waypoints).toEqual([A, B, C])
  })

  it('shows an error and drops the failed waypoint when no route can be found', async () => {
    const getRoute = vi.fn().mockRejectedValue(new Error('no route'))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.waypoints).toEqual([A])
    expect(result.current.path).toEqual([])
    expect(result.current.distanceMeters).toBe(0)
  })

  it('shows an error and leaves the route unchanged when the provider is unreachable', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockRejectedValueOnce(new Error('network down'))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))

    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.waypoints).toEqual([A, B])
    expect(result.current.distanceMeters).toBe(1000)
  })

  it('draws the route in click order even when routing responses resolve out of order', async () => {
    let resolveFirst!: (segment: ReturnType<typeof segmentBetween>) => void
    const firstCall = new Promise<ReturnType<typeof segmentBetween>>((resolve) => {
      resolveFirst = resolve
    })
    const getRoute = vi
      .fn()
      .mockImplementationOnce(() => firstCall)
      .mockImplementationOnce(() => Promise.resolve(segmentBetween(B, C, 500)))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    act(() => result.current.addWaypoint(C))

    // The second segment's response arrives first...
    await act(async () => {
      resolveFirst(segmentBetween(A, B, 1000))
    })
    await waitFor(() => expect(result.current.distanceMeters).toBe(1500))

    // ...but the drawn route still reflects click order, not response order.
    expect(result.current.path).toEqual([A, B, B, C])
    expect(result.current.distanceMeters).toBe(1500)
  })

  it('undoes the last waypoint and its incoming segment, recalculating the distance', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1500))

    act(() => result.current.undo())

    expect(result.current.waypoints).toEqual([A, B])
    expect(result.current.distanceMeters).toBe(1000)
  })

  it('undoing down to one waypoint clears the path and distance', async () => {
    const getRoute = vi.fn().mockResolvedValue(segmentBetween(A, B, 1000))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))

    act(() => result.current.undo())

    expect(result.current.waypoints).toEqual([A])
    expect(result.current.path).toEqual([])
    expect(result.current.distanceMeters).toBe(0)
  })

  it('undoing an empty route is a no-op', () => {
    const { result } = renderHook(() => useRoute({ getRoute: vi.fn() }))

    act(() => result.current.undo())

    expect(result.current.waypoints).toEqual([])
  })

  it('clears every waypoint, the whole path, and resets the distance', async () => {
    const getRoute = vi.fn().mockResolvedValue(segmentBetween(A, B, 1000))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))

    act(() => result.current.clear())

    expect(result.current.waypoints).toEqual([])
    expect(result.current.path).toEqual([])
    expect(result.current.distanceMeters).toBe(0)
  })
})
