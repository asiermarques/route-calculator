import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenRouteServiceProvider } from '../shared/routing/openRouteServiceProvider'
import { devRoutingProvider } from './devCredentials'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('devRoutingProvider', () => {
  it('builds a provider from VITE_ROUTING_PROVIDER/VITE_ROUTING_API_KEY in development (US-002)', () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_ROUTING_PROVIDER', 'openrouteservice')
    vi.stubEnv('VITE_ROUTING_API_KEY', 'dev-key')

    expect(devRoutingProvider()).toBeInstanceOf(OpenRouteServiceProvider)
  })

  it('returns null in development when the build-time configuration is missing or invalid', () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_ROUTING_PROVIDER', '')
    vi.stubEnv('VITE_ROUTING_API_KEY', '')

    expect(devRoutingProvider()).toBeNull()
  })

  it('never seeds outside development, even when both variables are set (BR-002)', () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_ROUTING_PROVIDER', 'openrouteservice')
    vi.stubEnv('VITE_ROUTING_API_KEY', 'dev-key')

    expect(devRoutingProvider()).toBeNull()
  })
})
