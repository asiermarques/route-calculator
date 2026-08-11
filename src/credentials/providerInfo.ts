import type { ProviderName } from '../shared/routing/config'

export type ProviderInfo = {
  /** Display name shown in the provider select and the instructions. */
  label: string
  /** Where a first-time visitor creates an account (FR-007). */
  signupUrl: string
  /** Where, once signed in, the visitor generates the key (FR-007). */
  keyPageUrl: string
  /** Which kind of credential the provider expects (FR-008). */
  credentialKind: string
  /** Free-tier reassurance for a first-time visitor (FR-008). */
  freeTierNote: string
}

/** Per-provider guidance for the credentials screen (US-003). The screen
 * renders this inline rather than linking out, so a first-time visitor with
 * no account can finish without leaving the page for anything but the
 * provider's own site. */
export const PROVIDER_INFO: Record<ProviderName, ProviderInfo> = {
  mapbox: {
    label: 'Mapbox Directions',
    signupUrl: 'https://www.mapbox.com/',
    keyPageUrl: 'https://account.mapbox.com/access-tokens/',
    credentialKind: 'your default public token (starts with "pk.") — not a secret ("sk.") token',
    freeTierNote: "Mapbox's free tier is enough for personal use.",
  },
  openrouteservice: {
    label: 'OpenRouteService',
    signupUrl: 'https://openrouteservice.org/dev/#/signup',
    keyPageUrl: 'https://openrouteservice.org/dev/#/home',
    credentialKind: 'the API key shown on your account dashboard',
    freeTierNote: "OpenRouteService's free tier is enough for personal use.",
  },
}
