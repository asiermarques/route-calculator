export type GeocodeMatch = {
  lat: number
  lon: number
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'

/** Geocodes a free-text address via Nominatim and resolves with its best
 * match, or `null` when nothing matches (EDGE-003, BR-001). Throws when the
 * request itself fails, so the caller can tell "no match" from "unreachable".
 *
 * Nominatim's usage policy asks for an identifying User-Agent or Referer; a
 * browser `fetch` always sends the page's Referer, which satisfies it — no
 * extra header is set here (browsers block a custom User-Agent anyway). */
export async function geocodeAddress(query: string): Promise<GeocodeMatch | null> {
  const url = new URL(NOMINATIM_SEARCH_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`)
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>
  if (results.length === 0) {
    return null
  }

  return { lat: Number(results[0].lat), lon: Number(results[0].lon) }
}
