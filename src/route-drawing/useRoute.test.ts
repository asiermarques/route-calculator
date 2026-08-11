import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRoute } from './useRoute'
import type { Waypoint } from './useRoute'
import type { RoutingProvider } from '../shared/routing/types'

const A = { lat: 40.41, lng: -3.7 }
const B = { lat: 40.42, lng: -3.71 }
const C = { lat: 40.43, lng: -3.72 }
const D = { lat: 40.44, lng: -3.73 }
const Z = { lat: 41.0, lng: -3.9 }

function segmentBetween(from: typeof A, to: typeof A, distanceMeters: number) {
  return { path: [from, to], distanceMeters }
}

/** Waypoints carry an internal id; tests care only about where they are. */
function coordsOf(waypoints: Waypoint[]) {
  return waypoints.map(({ lat, lng }) => ({ lat, lng }))
}

/** A routing call the test decides when — and whether — to answer. */
function deferredRoute() {
  let resolve!: (segment: ReturnType<typeof segmentBetween>) => void
  const promise = new Promise<ReturnType<typeof segmentBetween>>((r) => {
    resolve = r
  })
  return { promise, resolve }
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

    expect(coordsOf(result.current.waypoints)).toEqual([A])
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
    expect(coordsOf(result.current.waypoints)).toEqual([A, B])
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

    expect(coordsOf(result.current.waypoints)).toEqual([A, B, C])
  })

  it('routes from the waypoint before it, never from the clicked point itself', async () => {
    const getRoute = vi.fn().mockResolvedValue(segmentBetween(B, C, 500))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(500))
    act(() => result.current.addWaypoint(C))

    await waitFor(() => expect(getRoute).toHaveBeenCalledTimes(2))
    // The provider sees plain coordinates — the waypoint's internal id is ours.
    expect(getRoute).toHaveBeenLastCalledWith(B, C)
  })

  it('shows an error and drops the failed waypoint when no route can be found', async () => {
    const getRoute = vi.fn().mockRejectedValue(new Error('no route'))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(coordsOf(result.current.waypoints)).toEqual([A])
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

    expect(coordsOf(result.current.waypoints)).toEqual([A, B])
    expect(result.current.distanceMeters).toBe(1000)
  })

  it('draws the route in click order even when routing responses resolve out of order', async () => {
    const first = deferredRoute()
    const getRoute = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => Promise.resolve(segmentBetween(B, C, 500)))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    act(() => result.current.addWaypoint(C))

    // The second segment's response arrives first...
    await act(async () => {
      first.resolve(segmentBetween(A, B, 1000))
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

    expect(coordsOf(result.current.waypoints)).toEqual([A, B])
    expect(result.current.distanceMeters).toBe(1000)
  })

  it('undoes only the waypoint being removed, leaving segments drawn earlier alone', async () => {
    const second = deferredRoute()
    const getRoute = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(segmentBetween(A, B, 1000)))
      .mockImplementationOnce(() => second.promise)
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))

    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.isRouting).toBe(true))

    // Undone while its own segment is still in flight: there are three
    // waypoints but only one segment, so "drop the last segment" would eat the
    // already-drawn A–B.
    act(() => result.current.undo())

    expect(coordsOf(result.current.waypoints)).toEqual([A, B])
    expect(result.current.distanceMeters).toBe(1000)
    expect(result.current.path).toEqual([A, B])
  })

  it('discards a routing response for a waypoint that was undone while in flight', async () => {
    const second = deferredRoute()
    const getRoute = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(segmentBetween(A, B, 1000)))
      .mockImplementationOnce(() => second.promise)
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.isRouting).toBe(true))
    act(() => result.current.undo())

    await act(async () => {
      second.resolve(segmentBetween(B, C, 500))
    })

    expect(coordsOf(result.current.waypoints)).toEqual([A, B])
    expect(result.current.distanceMeters).toBe(1000)
    expect(result.current.isRouting).toBe(false)
  })

  it('undoing down to one waypoint clears the path and distance', async () => {
    const getRoute = vi.fn().mockResolvedValue(segmentBetween(A, B, 1000))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))

    act(() => result.current.undo())

    expect(coordsOf(result.current.waypoints)).toEqual([A])
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

  it('keeps the route usable after a routing call gives up, rather than wedging the queue', async () => {
    const getRoute = vi
      .fn()
      .mockRejectedValueOnce(new Error('timed out'))
      .mockResolvedValueOnce(segmentBetween(A, C, 800))
    const { result } = renderHook(() => useRoute({ getRoute }))

    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.error).not.toBeNull())

    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.distanceMeters).toBe(800))

    expect(coordsOf(result.current.waypoints)).toEqual([A, C])
    expect(result.current.error).toBeNull()
  })
})

describe('useRoute deleteWaypoint', () => {
  async function fourWaypointRoute(getRoute: RoutingProvider['getRoute']) {
    const { result } = renderHook(() => useRoute({ getRoute }))
    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1500))
    act(() => result.current.addWaypoint(D))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1800))
    return result
  }

  it('deletes a mid-route waypoint, re-joining its neighbours with one new segment', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
      .mockResolvedValueOnce(segmentBetween(C, D, 300))
      .mockResolvedValueOnce(segmentBetween(A, C, 1400))
    const result = await fourWaypointRoute(getRoute)
    const [, second] = result.current.waypoints

    act(() => result.current.deleteWaypoint(second.id))

    await waitFor(() => expect(coordsOf(result.current.waypoints)).toEqual([A, C, D]))
    expect(getRoute).toHaveBeenLastCalledWith(A, C)
    expect(result.current.isRouting).toBe(false)
    expect(result.current.distanceMeters).toBe(1400 + 300)
  })

  it('deletes the last waypoint with no routing call, dropping the distance to the previous total', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
      .mockResolvedValueOnce(segmentBetween(C, D, 300))
    const result = await fourWaypointRoute(getRoute)
    const last = result.current.waypoints.at(-1)!
    getRoute.mockClear()

    act(() => result.current.deleteWaypoint(last.id))

    await waitFor(() => expect(result.current.distanceMeters).toBe(1500))
    expect(getRoute).not.toHaveBeenCalled()
    expect(coordsOf(result.current.waypoints)).toEqual([A, B, C])
  })

  it('deletes the first waypoint with no routing call, the second becoming the start', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
      .mockResolvedValueOnce(segmentBetween(C, D, 300))
    const result = await fourWaypointRoute(getRoute)
    const first = result.current.waypoints[0]
    getRoute.mockClear()

    act(() => result.current.deleteWaypoint(first.id))

    await waitFor(() => expect(result.current.distanceMeters).toBe(800))
    expect(getRoute).not.toHaveBeenCalled()
    expect(coordsOf(result.current.waypoints)).toEqual([B, C, D])
  })

  it('deleting one of exactly two waypoints leaves a single waypoint and 0 km', async () => {
    const getRoute = vi.fn().mockResolvedValueOnce(segmentBetween(A, B, 1000))
    const { result } = renderHook(() => useRoute({ getRoute }))
    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))

    act(() => result.current.deleteWaypoint(result.current.waypoints[0].id))

    await waitFor(() => expect(coordsOf(result.current.waypoints)).toEqual([B]))
    expect(result.current.path).toEqual([])
    expect(result.current.distanceMeters).toBe(0)
  })

  it('reverts a mid-route delete whole when the replacement segment cannot be routed', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
      .mockResolvedValueOnce(segmentBetween(C, D, 300))
      .mockRejectedValueOnce(new Error('no route'))
    const result = await fourWaypointRoute(getRoute)
    const [, second] = result.current.waypoints

    act(() => result.current.deleteWaypoint(second.id))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(coordsOf(result.current.waypoints)).toEqual([A, B, C, D])
    expect(result.current.distanceMeters).toBe(1800)
    expect(result.current.path.length).toBeGreaterThan(0)
  })

  it('shows routing feedback while a delete is being re-routed', async () => {
    const deferred = deferredRoute()
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
      .mockResolvedValueOnce(segmentBetween(C, D, 300))
      .mockImplementationOnce(() => deferred.promise)
    const result = await fourWaypointRoute(getRoute)
    const [, second] = result.current.waypoints

    act(() => result.current.deleteWaypoint(second.id))
    await waitFor(() => expect(result.current.isRouting).toBe(true))

    await act(async () => deferred.resolve(segmentBetween(A, C, 1400)))
    await waitFor(() => expect(result.current.isRouting).toBe(false))
  })

  it('keeps edits in issue order: a delete issued while an earlier add is still in flight completes after it', async () => {
    const thirdSegment = deferredRoute()
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockImplementationOnce(() => thirdSegment.promise) // B -> C, still in flight
      .mockResolvedValueOnce(segmentBetween(A, C, 1400)) // the re-join, issued after
    const { result } = renderHook(() => useRoute({ getRoute }))
    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.isRouting).toBe(true))

    const middle = result.current.waypoints[1]
    act(() => result.current.deleteWaypoint(middle.id))

    await act(async () => thirdSegment.resolve(segmentBetween(B, C, 500)))
    await waitFor(() => expect(result.current.isRouting).toBe(false))

    expect(coordsOf(result.current.waypoints)).toEqual([A, C])
    expect(result.current.distanceMeters).toBe(1400)
  })

  it('a delete for a waypoint that no longer exists is a no-op', () => {
    const getRoute = vi.fn()
    const { result } = renderHook(() => useRoute({ getRoute }))
    act(() => result.current.addWaypoint(A))

    act(() => result.current.deleteWaypoint('not-a-real-id'))

    expect(coordsOf(result.current.waypoints)).toEqual([A])
    expect(getRoute).not.toHaveBeenCalled()
  })
})

describe('useRoute moveWaypoint', () => {
  it('moves a mid-route waypoint, re-routing both adjacent segments and keeping its place in the order', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
      .mockResolvedValueOnce(segmentBetween(A, Z, 1200))
      .mockResolvedValueOnce(segmentBetween(Z, C, 700))
    const { result } = renderHook(() => useRoute({ getRoute }))
    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1500))
    const middle = result.current.waypoints[1]

    act(() => result.current.moveWaypoint(middle.id, Z))

    await waitFor(() => expect(coordsOf(result.current.waypoints)).toEqual([A, Z, C]))
    expect(getRoute).toHaveBeenCalledWith(A, Z)
    expect(getRoute).toHaveBeenCalledWith(Z, C)
    expect(result.current.isRouting).toBe(false)
    expect(result.current.distanceMeters).toBe(1900)
  })

  it('moving the last waypoint re-routes only its incoming segment', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(A, Z, 1200))
    const { result } = renderHook(() => useRoute({ getRoute }))
    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    const last = result.current.waypoints.at(-1)!
    getRoute.mockClear()

    act(() => result.current.moveWaypoint(last.id, Z))

    await waitFor(() => expect(coordsOf(result.current.waypoints)).toEqual([A, Z]))
    expect(getRoute).toHaveBeenCalledTimes(1)
    expect(getRoute).toHaveBeenCalledWith(A, Z)
    expect(result.current.isRouting).toBe(false)
    expect(result.current.distanceMeters).toBe(1200)
  })

  it('moving the first waypoint re-routes only its outgoing segment', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(Z, B, 900))
    const { result } = renderHook(() => useRoute({ getRoute }))
    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    const first = result.current.waypoints[0]
    getRoute.mockClear()

    act(() => result.current.moveWaypoint(first.id, Z))

    await waitFor(() => expect(coordsOf(result.current.waypoints)).toEqual([Z, B]))
    expect(getRoute).toHaveBeenCalledTimes(1)
    expect(getRoute).toHaveBeenCalledWith(Z, B)
    expect(result.current.isRouting).toBe(false)
    expect(result.current.distanceMeters).toBe(900)
  })

  it('reverts a move whole, with an error, when either re-route fails', async () => {
    const getRoute = vi
      .fn()
      .mockResolvedValueOnce(segmentBetween(A, B, 1000))
      .mockResolvedValueOnce(segmentBetween(B, C, 500))
      .mockResolvedValueOnce(segmentBetween(A, Z, 1200))
      .mockRejectedValueOnce(new Error('no route'))
    const { result } = renderHook(() => useRoute({ getRoute }))
    act(() => result.current.addWaypoint(A))
    act(() => result.current.addWaypoint(B))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1000))
    act(() => result.current.addWaypoint(C))
    await waitFor(() => expect(result.current.distanceMeters).toBe(1500))
    const middle = result.current.waypoints[1]

    act(() => result.current.moveWaypoint(middle.id, Z))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(coordsOf(result.current.waypoints)).toEqual([A, B, C])
    expect(result.current.distanceMeters).toBe(1500)
  })
})
