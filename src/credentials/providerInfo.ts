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
  /** What a leak costs, shown before the key field — present only for a
   * provider whose key cannot be restricted to this app's domain at all
   * (003 US-003). Absent for a provider that does support restriction; the
   * two fields are mutually exclusive. */
  unrestrictableWarning?: string
  /** An extra instruction appended after the key-generation steps, naming
   * this deployment's own domain (the `string` argument, its runtime
   * origin) and where in the provider's dashboard to restrict the key to it
   * — present only for a provider that supports restriction (003 US-004). */
  restrictionStep?: (domain: string) => string
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
    credentialKind: 'your default public token — the one starting "pk.", not a secret "sk." one',
    freeTierNote: 'The free tier covers personal use.',
    restrictionStep: (domain) =>
      `On the same account.mapbox.com page, open the token and add ${domain} to its URL restrictions. ` +
      'A token taken from this page is then worthless anywhere else.',
  },
  openrouteservice: {
    label: 'OpenRouteService',
    signupUrl: 'https://openrouteservice.org/dev/#/signup',
    keyPageUrl: 'https://openrouteservice.org/dev/#/home',
    credentialKind: 'the API key on your account dashboard',
    freeTierNote: 'The free tier covers personal use.',
    unrestrictableWarning:
      'This key cannot be restricted to a domain — a leaked one is usable from anywhere, and ' +
      'OpenRouteService allows one account per person, so abuse of it can get your only account blocked.',
  },
}
