import { useCallback, useMemo, useRef, useState } from 'react'
import type { LatLng, RouteSegment, RoutingProvider } from '../shared/routing/types'

/** A clicked point, with an identity of its own. Position in the list is not
 * enough to identify a waypoint: while a segment is being fetched the list
 * grows ahead of the segments, so "the last one" means different things
 * depending on what is in flight. */
export type Waypoint = LatLng & { id: string }

/** A routed segment, tied to the waypoint it arrives at rather than to an
 * index. This is what lets `undo` remove exactly the segment belonging to the
 * waypoint being removed, in any state — including with a later segment still
 * in flight, where segments and waypoints are not in lockstep. */
type Segment = RouteSegment & { toId: string }

type RouteState = {
  waypoints: Waypoint[]
  segments: Segment[]
  isRouting: boolean
  error: string | null
}

const EMPTY_STATE: RouteState = { waypoints: [], segments: [], isRouting: false, error: null }

const ROUTING_ERROR_MESSAGE =
  'Could not find a route to that point. The route was left as it was — try a different spot.'

let lastWaypointId = 0
function nextWaypointId() {
  lastWaypointId += 1
  return `waypoint-${lastWaypointId}`
}

/** Owns the route being drawn: the ordered waypoints, their snapped segments,
 * and the running total distance (FR-003 through FR-007). Each waypoint is
 * shown the instant it is clicked, for immediate feedback, while its segment
 * is fetched from the routing provider in the background; a failed segment
 * drops that waypoint and leaves the route in its last valid state (FR-009).
 *
 * Clicks are processed through a queue so that segments are always appended
 * in click order, regardless of the order routing responses arrive in
 * (EDGE-002). */
export function useRoute(provider: RoutingProvider) {
  const [state, setState] = useState<RouteState>(EMPTY_STATE)
  const stateRef = useRef(state)
  const queueRef = useRef(Promise.resolve())

  const update = useCallback((updater: (s: RouteState) => RouteState) => {
    stateRef.current = updater(stateRef.current)
    setState(stateRef.current)
  }, [])

  const addWaypoint = useCallback(
    (point: LatLng) => {
      const waypoint: Waypoint = { ...point, id: nextWaypointId() }
      update((s) => ({ ...s, waypoints: [...s.waypoints, waypoint], error: null }))

      queueRef.current = queueRef.current.then(async () => {
        const waypoints = stateRef.current.waypoints
        const index = waypoints.findIndex((w) => w.id === waypoint.id)
        if (index <= 0) return // first waypoint of the route (so far), or already undone
        const from = waypoints[index - 1]

        update((s) => ({ ...s, isRouting: true }))
        try {
          const segment = await provider.getRoute(
            { lat: from.lat, lng: from.lng },
            { lat: waypoint.lat, lng: waypoint.lng },
          )
          update((s) =>
            s.waypoints.some((w) => w.id === waypoint.id)
              ? { ...s, segments: [...s.segments, { ...segment, toId: waypoint.id }], isRouting: false }
              : { ...s, isRouting: false },
          )
        } catch {
          update((s) => ({
            ...s,
            waypoints: s.waypoints.filter((w) => w.id !== waypoint.id),
            isRouting: false,
            error: ROUTING_ERROR_MESSAGE,
          }))
        }
      })
    },
    [provider, update],
  )

  const undo = useCallback(() => {
    update((s) => {
      const last = s.waypoints.at(-1)
      if (!last) return s
      return {
        ...s,
        waypoints: s.waypoints.slice(0, -1),
        segments: s.segments.filter((segment) => segment.toId !== last.id),
        error: null,
      }
    })
  }, [update])

  const clear = useCallback(() => {
    update(() => EMPTY_STATE)
  }, [update])

  // Memoised: a long route holds thousands of points, and these would otherwise
  // be rebuilt on every render — including renders that only toggle `isRouting`.
  // A stable `path` identity also stops Leaflet redrawing an unchanged polyline.
  const path = useMemo(() => state.segments.flatMap((segment) => segment.path), [state.segments])
  const distanceMeters = useMemo(
    () => state.segments.reduce((sum, segment) => sum + segment.distanceMeters, 0),
    [state.segments],
  )

  return {
    waypoints: state.waypoints,
    path,
    distanceMeters,
    isRouting: state.isRouting,
    error: state.error,
    addWaypoint,
    undo,
    clear,
  }
}
