import type { RoutingProvider } from './types'
import { OpenRouteServiceProvider } from './openRouteServiceProvider'
import { MapboxDirectionsProvider } from './mapboxDirectionsProvider'

const PROVIDER_NAMES = ['openrouteservice', 'mapbox'] as const
type ProviderName = (typeof PROVIDER_NAMES)[number]

export type RoutingEnv = {
  VITE_ROUTING_PROVIDER?: string
  VITE_ROUTING_API_KEY?: string
}

/** Thrown when the build-time routing configuration is missing or invalid,
 * so the app can fail clearly at startup instead of on the user's first
 * click (US-005). */
export class RoutingConfigError extends Error {}

function isProviderName(value: string | undefined): value is ProviderName {
  return PROVIDER_NAMES.includes(value as ProviderName)
}

/** Builds the routing provider selected by build-time configuration
 * (`VITE_ROUTING_PROVIDER`, `VITE_ROUTING_API_KEY`). Throws
 * `RoutingConfigError` with a message naming the problem when the provider
 * is unknown or its key is missing. */
export function createRoutingProvider(env: RoutingEnv): RoutingProvider {
  const { VITE_ROUTING_PROVIDER: name, VITE_ROUTING_API_KEY: apiKey } = env

  if (!isProviderName(name)) {
    throw new RoutingConfigError(
      `Unknown routing provider "${name ?? ''}". Set VITE_ROUTING_PROVIDER to one of: ${PROVIDER_NAMES.join(', ')}.`,
    )
  }

  if (!apiKey) {
    throw new RoutingConfigError(
      'Missing routing provider API key. Set VITE_ROUTING_API_KEY to your provider API key.',
    )
  }

  return name === 'openrouteservice'
    ? new OpenRouteServiceProvider(apiKey)
    : new MapboxDirectionsProvider(apiKey)
}
