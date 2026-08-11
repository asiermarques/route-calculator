import type { LatLngTuple } from 'leaflet'
import { OSM_TILE_ORIGIN_PATTERN } from '../net/outboundOrigins'

/** Falls back to this view whenever no address has centred the map yet. */
export const DEFAULT_CENTER: LatLngTuple = [40.4168, -3.7038] // Madrid
/** Street level, not city level. The first thing a visitor does here is click
 * along streets to place waypoints, and at 13 a city fills the screen with
 * roads too small to aim at — the route gets drawn, but not where it was
 * meant. 14 keeps a few kilometres of a route on screen at once, which is the
 * size of route this app is for; searching an address still jumps closer, to
 * 16 (`AddressSearchBar`). */
export const DEFAULT_ZOOM = 14

// Leaflet's own `{s}` subdomain placeholder, not the `*` the CSP wildcard
// uses (US-002) — built from the shared origin so the two can't disagree on
// which host they mean, only on how each of them spells "any subdomain".
export const OSM_TILE_URL = `${OSM_TILE_ORIGIN_PATTERN.replace('*', '{s}')}/{z}/{x}/{y}.png`
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
