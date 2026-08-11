/** Raised when a third-party response does not have the shape this app relies
 * on. Carries no URL and no credential, so it stays safe to log or surface
 * (BR-001). */
export class MalformedResponseError extends Error {
  constructor(what: string) {
    super(`Malformed response: ${what}`)
    this.name = 'MalformedResponseError'
  }
}

/** A finite number, or a rejection. Nominatim and the routing providers are
 * outside this app's control, and their responses are the only untrusted input
 * it has: a missing or unparseable field would otherwise travel as `NaN` all
 * the way to a "NaN km" readout or a Leaflet layer built from invalid
 * coordinates. Failing here turns that into the "could not route" / "search
 * unavailable" path the app already handles (ARCHITECTURE.md §Constraints). */
export function requireFiniteNumber(value: unknown, what: string): number {
  // `Number('')` and `Number('  ')` are 0, so a blank coordinate would pass as
  // a real position off the coast of Africa instead of failing.
  if (typeof value === 'string' && value.trim() === '') return failWith(what)

  const parsed = typeof value === 'string' ? Number(value) : value

  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    return failWith(what)
  }

  return parsed
}

/** A `[longitude, latitude]` pair from a GeoJSON geometry, as the internal
 * `{ lat, lng }` shape — both coordinates checked and in range. */
export function requireLatLngFromGeoJson(value: unknown, what: string): { lat: number; lng: number } {
  if (!Array.isArray(value)) return failWith(what)

  const lng = requireFiniteNumber(value[0], `${what} longitude`)
  const lat = requireFiniteNumber(value[1], `${what} latitude`)

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return failWith(`${what} out of range`)
  }

  return { lat, lng }
}

/** A non-empty list of GeoJSON coordinate pairs, as internal points. */
export function requirePath(value: unknown, what: string): Array<{ lat: number; lng: number }> {
  if (!Array.isArray(value) || value.length === 0) return failWith(what)

  return value.map((point) => requireLatLngFromGeoJson(point, `${what} point`))
}

function failWith(what: string): never {
  throw new MalformedResponseError(what)
}
