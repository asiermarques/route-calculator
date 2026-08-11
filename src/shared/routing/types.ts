export type LatLng = { lat: number; lng: number }

export type RouteSegment = {
  path: LatLng[]
  distanceMeters: number
}

/** A provider that computes a street-snapped path and its length between two
 * points (US-003). Implementations live alongside this interface in
 * `src/shared/routing/`; the rest of the app depends only on this narrow
 * contract, never on a specific provider (ARCHITECTURE.md). Rejects when no
 * route can be found between the two points, or when the request itself
 * fails — callers treat both as "could not route" (FR-009). */
export interface RoutingProvider {
  getRoute(from: LatLng, to: LatLng): Promise<RouteSegment>
}
