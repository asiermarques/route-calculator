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

  const deleteWaypoint = useCallback(
    (id: string) => {
      queueRef.current = queueRef.current.then(async () => {
        const waypoints = stateRef.current.waypoints
        const index = waypoints.findIndex((w) => w.id === id)
        if (index === -1) return // already gone: undone, cleared, or deleted twice

        const next = waypoints[index + 1]

        if (!next) {
          // last waypoint: drop it and its incoming segment, same as undo (BR-003)
          update((s) => ({
            ...s,
            waypoints: s.waypoints.filter((w) => w.id !== id),
            segments: s.segments.filter((segment) => segment.toId !== id),
            error: null,
          }))
          return
        }

        if (index === 0) {
          // first waypoint: drop its outgoing segment, the next waypoint becomes
          // the start of the route — no re-route needed either (BR-003)
          update((s) => ({
            ...s,
            waypoints: s.waypoints.filter((w) => w.id !== id),
            segments: s.segments.filter((segment) => segment.toId !== next.id),
            error: null,
          }))
          return
        }

        // A neighbour on each side: re-join them with one newly routed segment
        // (FR-006). Nothing optimistic to show here, unlike addWaypoint — the
        // route must not change at all until the replacement segment is in hand.
        const prev = waypoints[index - 1]
        update((s) => ({ ...s, isRouting: true }))
        try {
          const segment = await provider.getRoute(
            { lat: prev.lat, lng: prev.lng },
            { lat: next.lat, lng: next.lng },
          )
          update((s) =>
            s.waypoints.some((w) => w.id === id)
              ? {
                  ...s,
                  waypoints: s.waypoints.filter((w) => w.id !== id),
                  segments: [
                    ...s.segments.filter((seg) => seg.toId !== id && seg.toId !== next.id),
                    { ...segment, toId: next.id },
                  ],
                  isRouting: false,
                }
              : { ...s, isRouting: false },
          )
        } catch {
          update((s) => ({ ...s, isRouting: false, error: ROUTING_ERROR_MESSAGE }))
        }
      })
    },
    [provider, update],
  )

  const moveWaypoint = useCallback(
    (id: string, point: LatLng) => {
      queueRef.current = queueRef.current.then(async () => {
        const waypoints = stateRef.current.waypoints
        const index = waypoints.findIndex((w) => w.id === id)
        if (index === -1) return // already gone

        const prev = waypoints[index - 1]
        const next = waypoints[index + 1]

        if (!prev && !next) {
          // The only waypoint on the route: nothing to re-route (quota NFR).
          update((s) =>
            s.waypoints.some((w) => w.id === id)
              ? { ...s, waypoints: s.waypoints.map((w) => (w.id === id ? { ...w, ...point } : w)) }
              : s,
          )
          return
        }

        update((s) => ({ ...s, isRouting: true }))
        try {
          // Only the segments this waypoint actually has are re-fetched — an
          // endpoint move costs one call, a mid-route move costs two, run
          // together so the edit either lands whole or not at all (BR-001).
          const [incoming, outgoing] = await Promise.all([
            prev ? provider.getRoute({ lat: prev.lat, lng: prev.lng }, point) : Promise.resolve(null),
            next ? provider.getRoute(point, { lat: next.lat, lng: next.lng }) : Promise.resolve(null),
          ])
          update((s) => {
            if (!s.waypoints.some((w) => w.id === id)) return { ...s, isRouting: false }
            return {
              ...s,
              waypoints: s.waypoints.map((w) => (w.id === id ? { ...w, ...point } : w)),
              segments: [
                ...s.segments.filter(
                  (seg) => seg.toId !== id && (!next || seg.toId !== next.id),
                ),
                ...(incoming ? [{ ...incoming, toId: id }] : []),
                ...(outgoing && next ? [{ ...outgoing, toId: next.id }] : []),
              ],
              isRouting: false,
            }
          })
        } catch {
          update((s) => ({ ...s, isRouting: false, error: ROUTING_ERROR_MESSAGE }))
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
  // Built from waypoint order rather than segment array order: a delete or
  // move replaces segments in place rather than at the end, so array order is
  // no longer a reliable stand-in for route order once edits exist.
  const path = useMemo(() => {
    const segmentByToId = new Map(state.segments.map((segment) => [segment.toId, segment]))
    return state.waypoints.slice(1).flatMap((w) => segmentByToId.get(w.id)?.path ?? [])
  }, [state.segments, state.waypoints])
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
    deleteWaypoint,
    moveWaypoint,
    undo,
    clear,
  }
}
