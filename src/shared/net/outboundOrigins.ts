/** The only origins this app is ever allowed to talk to over the network —
 * its own origin aside. Every module that makes a request imports its origin
 * from here rather than declaring its own copy, so the request-making code
 * and the production Content-Security-Policy (`contentSecurityPolicy.ts`,
 * US-001) cannot independently drift from each other. A file that hardcodes
 * a new `https://` origin instead of adding it here fails
 * `outboundOrigins.test.ts` before it ever reaches a production build
 * (RISK-002, US-002). */

/** OpenStreetMap's tile host, requested from a wildcard subdomain
 * (`a.`/`b.`/`c.tile...`, EDGE-001) — the one origin below that isn't a
 * single fixed host. */
export const OSM_TILE_ORIGIN_PATTERN = 'https://*.tile.openstreetmap.org'

export const NOMINATIM_ORIGIN = 'https://nominatim.openstreetmap.org'
export const OPENROUTESERVICE_ORIGIN = 'https://api.openrouteservice.org'
export const MAPBOX_ORIGIN = 'https://api.mapbox.com'

export const OUTBOUND_ORIGINS = [
  OSM_TILE_ORIGIN_PATTERN,
  NOMINATIM_ORIGIN,
  OPENROUTESERVICE_ORIGIN,
  MAPBOX_ORIGIN,
] as const
