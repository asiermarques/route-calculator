import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapboxDirectionsProvider } from './mapboxDirectionsProvider'
import { rejectionOf } from '../../test/rejectionOf'

const FROM = { lat: 40.4168, lng: -3.7038 }
const TO = { lat: 40.42, lng: -3.7 }

function directionsResponse(coordinates: Array<[number, number]>, distance: number) {
  return new Response(
    JSON.stringify({
      routes: [{ geometry: { coordinates }, distance }],
    }),
    { status: 200 },
  )
}

describe('MapboxDirectionsProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests a route between the two points, authenticated with the API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(directionsResponse([[-3.7038, 40.4168], [-3.7, 40.42]], 500))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new MapboxDirectionsProvider('test-token')

    await provider.getRoute(FROM, TO)

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string)
    expect(requestedUrl.href).toContain('api.mapbox.com/directions/v5/mapbox')
    expect(requestedUrl.pathname).toContain(`${FROM.lng},${FROM.lat};${TO.lng},${TO.lat}`)
    expect(requestedUrl.searchParams.get('access_token')).toBe('test-token')
    expect(requestedUrl.searchParams.get('geometries')).toBe('geojson')
  })

  it('resolves with the snapped path and its distance in meters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(directionsResponse([[-3.7038, 40.4168], [-3.705, 40.418], [-3.7, 40.42]], 542)),
    )
    const provider = new MapboxDirectionsProvider('test-token')

    const segment = await provider.getRoute(FROM, TO)

    expect(segment.distanceMeters).toBe(542)
    expect(segment.path).toEqual([
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.418, lng: -3.705 },
      { lat: 40.42, lng: -3.7 },
    ])
  })

  it('throws when the service responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    const provider = new MapboxDirectionsProvider('test-token')

    await expect(provider.getRoute(FROM, TO)).rejects.toThrow()
  })

  it('throws when no route is found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'NoRoute', routes: [] }), { status: 200 })),
    )
    const provider = new MapboxDirectionsProvider('test-token')

    await expect(provider.getRoute(FROM, TO)).rejects.toThrow()
  })

  it('throws when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network error')))
    const provider = new MapboxDirectionsProvider('test-token')

    await expect(provider.getRoute(FROM, TO)).rejects.toThrow()
  })

  it.each([
    ['a distance that is not a number', { routes: [{ geometry: { coordinates: [[-3.7, 40.4]] } }] }],
    ['a missing geometry', { routes: [{ distance: 542 }] }],
    ['an empty geometry', { routes: [{ geometry: { coordinates: [] }, distance: 542 }] }],
    [
      'a coordinate out of range',
      { routes: [{ geometry: { coordinates: [[-3.7, 400]] }, distance: 542 }] },
    ],
  ])('throws rather than returning an unusable segment: %s', async (_label, body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
    )
    const provider = new MapboxDirectionsProvider('test-token')

    await expect(provider.getRoute(FROM, TO)).rejects.toThrow()
  })

  it('bounds the request, so an unanswered route cannot wedge the routing queue', async () => {
    const fetchMock = vi.fn().mockResolvedValue(directionsResponse([[-3.7038, 40.4168]], 0))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new MapboxDirectionsProvider('test-token')

    await provider.getRoute(FROM, TO)

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it('never puts the access token in the error it throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })))
    const provider = new MapboxDirectionsProvider('test-token')

    const error = await rejectionOf(provider.getRoute(FROM, TO))

    expect(error.message).not.toContain('test-token')
    expect(error.message).not.toContain('api.mapbox.com')
  })
})
