import { fetchWithTimeout } from '../http/fetchWithTimeout'
import { requireFiniteNumber, requirePath } from '../http/parse'
import { OPENROUTESERVICE_ORIGIN } from '../net/outboundOrigins'
import type { LatLng, RouteSegment, RoutingProvider } from './types'

const DIRECTIONS_URL = `${OPENROUTESERVICE_ORIGIN}/v2/directions`
// A single default profile for all routes (ASM-002) — the product doesn't
// distinguish activities, and foot-walking suits both running and walking.
const PROFILE = 'foot-walking'

type OrsFeature = {
  geometry?: { coordinates?: unknown }
  properties?: { summary?: { distance?: unknown } }
}

/** Routing provider backed by OpenRouteService's Directions API. */
export class OpenRouteServiceProvider implements RoutingProvider {
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getRoute(from: LatLng, to: LatLng): Promise<RouteSegment> {
    const response = await fetchWithTimeout(`${DIRECTIONS_URL}/${PROFILE}/geojson`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouteService request failed with status ${response.status}`)
    }

    const data = (await response.json()) as { features?: OrsFeature[] }
    const feature = data.features?.[0]
    if (!feature) {
      throw new Error('OpenRouteService returned no route between those points')
    }

    return {
      path: requirePath(feature.geometry?.coordinates, 'OpenRouteService route geometry'),
      distanceMeters: requireFiniteNumber(
        feature.properties?.summary?.distance,
        'OpenRouteService route distance',
      ),
    }
  }
}
