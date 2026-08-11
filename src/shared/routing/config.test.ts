import { describe, expect, it } from 'vitest'
import { createRoutingProvider, RoutingConfigError } from './config'
import { OpenRouteServiceProvider } from './openRouteServiceProvider'
import { MapboxDirectionsProvider } from './mapboxDirectionsProvider'

describe('createRoutingProvider', () => {
  it('builds an OpenRouteService provider when configured for it', () => {
    const provider = createRoutingProvider({
      VITE_ROUTING_PROVIDER: 'openrouteservice',
      VITE_ROUTING_API_KEY: 'ors-key',
    })

    expect(provider).toBeInstanceOf(OpenRouteServiceProvider)
  })

  it('builds a Mapbox Directions provider when configured for it', () => {
    const provider = createRoutingProvider({
      VITE_ROUTING_PROVIDER: 'mapbox',
      VITE_ROUTING_API_KEY: 'mapbox-key',
    })

    expect(provider).toBeInstanceOf(MapboxDirectionsProvider)
  })

  it('fails clearly, naming the valid providers, when the provider name is unknown', () => {
    expect(() =>
      createRoutingProvider({ VITE_ROUTING_PROVIDER: 'graphhopper', VITE_ROUTING_API_KEY: 'x' }),
    ).toThrow(RoutingConfigError)
    expect(() =>
      createRoutingProvider({ VITE_ROUTING_PROVIDER: 'graphhopper', VITE_ROUTING_API_KEY: 'x' }),
    ).toThrow(/openrouteservice.*mapbox|mapbox.*openrouteservice/)
  })

  it('fails clearly, naming the missing variable, when no API key is set', () => {
    expect(() =>
      createRoutingProvider({ VITE_ROUTING_PROVIDER: 'openrouteservice', VITE_ROUTING_API_KEY: '' }),
    ).toThrow(RoutingConfigError)
    expect(() =>
      createRoutingProvider({ VITE_ROUTING_PROVIDER: 'openrouteservice', VITE_ROUTING_API_KEY: '' }),
    ).toThrow(/VITE_ROUTING_API_KEY/)
  })
})
