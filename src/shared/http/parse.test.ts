import { describe, expect, it } from 'vitest'
import {
  MalformedResponseError,
  requireFiniteNumber,
  requireLatLngFromGeoJson,
  requirePath,
} from './parse'

describe('requireFiniteNumber', () => {
  it('accepts a number', () => {
    expect(requireFiniteNumber(542, 'distance')).toBe(542)
    expect(requireFiniteNumber(0, 'distance')).toBe(0)
    expect(requireFiniteNumber(-3.7038, 'longitude')).toBe(-3.7038)
  })

  it('accepts a numeric string, as Nominatim sends coordinates', () => {
    expect(requireFiniteNumber('40.4168', 'latitude')).toBe(40.4168)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an unparseable string', 'north-ish'],
    ['an empty string', ''],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['an object', { value: 1 }],
  ])('rejects %s rather than letting it travel on as NaN', (_label, value) => {
    expect(() => requireFiniteNumber(value, 'distance')).toThrow(MalformedResponseError)
  })

  it('names the field it rejected, and nothing else', () => {
    const error = new Error('unreachable')
    try {
      requireFiniteNumber(undefined, 'Mapbox Directions route distance')
    } catch (reason) {
      expect((reason as Error).message).toBe(
        'Malformed response: Mapbox Directions route distance',
      )
      return
    }
    throw error
  })
})

describe('requireLatLngFromGeoJson', () => {
  it('reads a GeoJSON [lng, lat] pair into the internal shape', () => {
    expect(requireLatLngFromGeoJson([-3.7038, 40.4168], 'point')).toEqual({
      lat: 40.4168,
      lng: -3.7038,
    })
  })

  it.each([
    ['a non-array', { lat: 1, lng: 2 }],
    ['a pair with a missing coordinate', [-3.7038]],
    ['a pair with a null coordinate', [-3.7038, null]],
    ['a latitude beyond the pole', [-3.7038, 91]],
    ['a longitude past the antimeridian', [181, 40.4168]],
  ])('rejects %s', (_label, value) => {
    expect(() => requireLatLngFromGeoJson(value, 'point')).toThrow(MalformedResponseError)
  })
})

describe('requirePath', () => {
  it('reads a list of GeoJSON pairs into internal points', () => {
    expect(
      requirePath(
        [
          [-3.7038, 40.4168],
          [-3.7, 40.42],
        ],
        'geometry',
      ),
    ).toEqual([
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.42, lng: -3.7 },
    ])
  })

  it.each([
    ['an empty list, which would draw nothing', []],
    ['a missing geometry', undefined],
    ['a list with one bad pair among good ones', [[-3.7038, 40.4168], ['x', 'y']]],
  ])('rejects %s', (_label, value) => {
    expect(() => requirePath(value, 'geometry')).toThrow(MalformedResponseError)
  })
})
