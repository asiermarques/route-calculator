import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeAddress } from './geocode'

describe('geocodeAddress', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests a single best match from Nominatim for the given query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ lat: '40.4168', lon: '-3.7038' }]), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await geocodeAddress('Puerta del Sol, Madrid')

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string)
    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      'https://nominatim.openstreetmap.org/search',
    )
    expect(requestedUrl.searchParams.get('q')).toBe('Puerta del Sol, Madrid')
    expect(requestedUrl.searchParams.get('format')).toBe('jsonv2')
    expect(requestedUrl.searchParams.get('limit')).toBe('1')
  })

  it('resolves with the best match coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ lat: '40.4168', lon: '-3.7038' }]), { status: 200 }),
      ),
    )

    const match = await geocodeAddress('Puerta del Sol, Madrid')

    expect(match).toEqual({ lat: 40.4168, lon: -3.7038 })
  })

  it('resolves with null when there is no match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })))

    const match = await geocodeAddress('asdkjhaskjdhaskjdh nonexistent place')

    expect(match).toBeNull()
  })

  it('throws when the service responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))

    await expect(geocodeAddress('anywhere')).rejects.toThrow()
  })

  it('throws when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network error')))

    await expect(geocodeAddress('anywhere')).rejects.toThrow()
  })
})
