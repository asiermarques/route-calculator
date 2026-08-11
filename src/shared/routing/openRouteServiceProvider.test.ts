import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenRouteServiceProvider } from './openRouteServiceProvider'

const FROM = { lat: 40.4168, lng: -3.7038 }
const TO = { lat: 40.42, lng: -3.7 }

function geojsonResponse(coordinates: Array<[number, number]>, distance: number) {
  return new Response(
    JSON.stringify({
      features: [
        {
          geometry: { coordinates },
          properties: { summary: { distance } },
        },
      ],
    }),
    { status: 200 },
  )
}

describe('OpenRouteServiceProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests a route between the two points, authenticated with the API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geojsonResponse([[-3.7038, 40.4168], [-3.7, 40.42]], 500))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new OpenRouteServiceProvider('test-key')

    await provider.getRoute(FROM, TO)

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('api.openrouteservice.org/v2/directions')
    expect(init.headers.Authorization).toBe('test-key')
    const body = JSON.parse(init.body)
    expect(body.coordinates).toEqual([
      [FROM.lng, FROM.lat],
      [TO.lng, TO.lat],
    ])
  })

  it('resolves with the snapped path and its distance in meters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(geojsonResponse([[-3.7038, 40.4168], [-3.705, 40.418], [-3.7, 40.42]], 542)),
    )
    const provider = new OpenRouteServiceProvider('test-key')

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
    const provider = new OpenRouteServiceProvider('test-key')

    await expect(provider.getRoute(FROM, TO)).rejects.toThrow()
  })

  it('throws when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network error')))
    const provider = new OpenRouteServiceProvider('test-key')

    await expect(provider.getRoute(FROM, TO)).rejects.toThrow()
  })

  it.each([
    [
      'a distance that is not a number',
      { features: [{ geometry: { coordinates: [[-3.7, 40.4]] }, properties: { summary: {} } }] },
    ],
    ['a missing geometry', { features: [{ properties: { summary: { distance: 542 } } }] }],
    [
      'an empty geometry',
      {
        features: [
          { geometry: { coordinates: [] }, properties: { summary: { distance: 542 } } },
        ],
      },
    ],
    [
      'a coordinate out of range',
      {
        features: [
          { geometry: { coordinates: [[-3.7, 400]] }, properties: { summary: { distance: 542 } } },
        ],
      },
    ],
  ])('throws rather than returning an unusable segment: %s', async (_label, body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
    )
    const provider = new OpenRouteServiceProvider('test-key')

    await expect(provider.getRoute(FROM, TO)).rejects.toThrow()
  })

  it('bounds the request, so an unanswered route cannot wedge the routing queue', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geojsonResponse([[-3.7038, 40.4168]], 0))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new OpenRouteServiceProvider('test-key')

    await provider.getRoute(FROM, TO)

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
})
