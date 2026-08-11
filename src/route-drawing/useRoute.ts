import { useCallback, useRef, useState } from 'react'
import type { LatLng, RouteSegment, RoutingProvider } from '../shared/routing/types'

type RouteState = {
  waypoints: LatLng[]
  segments: RouteSegment[]
  isRouting: boolean
  error: string | null
}

const EMPTY_STATE: RouteState = { waypoints: [], segments: [], isRouting: false, error: null }

const ROUTING_ERROR_MESSAGE =
  'Could not find a route to that point. The route was left as it was — try a different spot.'

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
      update((s) => ({ ...s, waypoints: [...s.waypoints, point], error: null }))

      queueRef.current = queueRef.current.then(async () => {
        const waypoints = stateRef.current.waypoints
        const index = waypoints.indexOf(point)
        if (index <= 0) return // first waypoint of the route (so far) — nothing to route yet
        const from = waypoints[index - 1]

        update((s) => ({ ...s, isRouting: true }))
        try {
          const segment = await provider.getRoute(from, point)
          update((s) =>
            s.waypoints.includes(point)
              ? { ...s, segments: [...s.segments, segment], isRouting: false }
              : { ...s, isRouting: false },
          )
        } catch {
          update((s) => ({
            ...s,
            waypoints: s.waypoints.filter((w) => w !== point),
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
      if (s.waypoints.length === 0) return s
      return {
        waypoints: s.waypoints.slice(0, -1),
        segments: s.segments.slice(0, -1),
        isRouting: s.isRouting,
        error: null,
      }
    })
  }, [update])

  const clear = useCallback(() => {
    update(() => EMPTY_STATE)
  }, [update])

  const path = state.segments.flatMap((segment) => segment.path)
  const distanceMeters = state.segments.reduce((sum, segment) => sum + segment.distanceMeters, 0)

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

export type RouteApi = ReturnType<typeof useRoute>
