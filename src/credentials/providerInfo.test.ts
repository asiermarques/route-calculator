import { describe, expect, it } from 'vitest'
import { PROVIDER_NAMES } from '../shared/routing/config'
import { PROVIDER_INFO } from './providerInfo'

describe('PROVIDER_INFO', () => {
  it('has an entry with non-empty guidance for every supported provider', () => {
    for (const name of PROVIDER_NAMES) {
      const info = PROVIDER_INFO[name]
      expect(info.label).not.toBe('')
      expect(info.signupUrl).toMatch(/^https:\/\//)
      expect(info.keyPageUrl).toMatch(/^https:\/\//)
      expect(info.credentialKind).not.toBe('')
      expect(info.freeTierNote).not.toBe('')
    }
  })

  it('tells the Mapbox visitor to use a public "pk." token, not a secret one (FR-008)', () => {
    expect(PROVIDER_INFO.mapbox.credentialKind).toMatch(/public/i)
    expect(PROVIDER_INFO.mapbox.credentialKind).toMatch(/pk\./)
  })

  it('tells the OpenRouteService visitor to use the account API key from the dashboard (FR-008)', () => {
    expect(PROVIDER_INFO.openrouteservice.credentialKind).toMatch(/api key/i)
    expect(PROVIDER_INFO.openrouteservice.credentialKind).toMatch(/dashboard/i)
  })
})
