import type { LatLngTuple } from 'leaflet'
import { OSM_TILE_ORIGIN_PATTERN } from '../net/outboundOrigins'

/** Falls back to this view whenever no address has centred the map yet. */
export const DEFAULT_CENTER: LatLngTuple = [40.4168, -3.7038] // Madrid
export const DEFAULT_ZOOM = 13

// Leaflet's own `{s}` subdomain placeholder, not the `*` the CSP wildcard
// uses (US-002) — built from the shared origin so the two can't disagree on
// which host they mean, only on how each of them spells "any subdomain".
export const OSM_TILE_URL = `${OSM_TILE_ORIGIN_PATTERN.replace('*', '{s}')}/{z}/{x}/{y}.png`
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
