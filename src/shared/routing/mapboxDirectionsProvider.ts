import { fetchWithTimeout } from '../http/fetchWithTimeout'
import { requireFiniteNumber, requirePath } from '../http/parse'
import type { LatLng, RouteSegment, RoutingProvider } from './types'

const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox'
// A single default profile for all routes (ASM-002) — the product doesn't
// distinguish activities, and walking suits both running and walking.
const PROFILE = 'walking'

type MapboxRoute = {
  geometry?: { coordinates?: unknown }
  distance?: unknown
}

/** Routing provider backed by Mapbox's Directions API — a drop-in
 * alternative to OpenRouteService, selected by configuration (US-005). */
export class MapboxDirectionsProvider implements RoutingProvider {
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getRoute(from: LatLng, to: LatLng): Promise<RouteSegment> {
    const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`
    const url = new URL(`${DIRECTIONS_URL}/${PROFILE}/${coordinates}`)
    url.searchParams.set('geometries', 'geojson')
    url.searchParams.set('access_token', this.apiKey)

    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      throw new Error(`Mapbox Directions request failed with status ${response.status}`)
    }

    const data = (await response.json()) as { routes?: MapboxRoute[] }
    const route = data.routes?.[0]
    if (!route) {
      throw new Error('Mapbox Directions returned no route between those points')
    }

    return {
      path: requirePath(route.geometry?.coordinates, 'Mapbox Directions route geometry'),
      distanceMeters: requireFiniteNumber(route.distance, 'Mapbox Directions route distance'),
    }
  }
}
