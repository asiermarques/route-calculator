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

  it('warns that an OpenRouteService key cannot be restricted, what a leak costs, and that it is the only account (003 US-003)', () => {
    const warning = PROVIDER_INFO.openrouteservice.unrestrictableWarning
    expect(warning).toBeDefined()
    expect(warning).toMatch(/cannot be restricted/i)
    expect(warning).toMatch(/anywhere/i)
    expect(warning).toMatch(/only.*account|one account/i)
    expect(warning).toMatch(/blocked/i)
  })

  it('gives Mapbox no unrestrictable warning, since its key can be restricted (003 US-003)', () => {
    expect(PROVIDER_INFO.mapbox.unrestrictableWarning).toBeUndefined()
  })

  it('gives Mapbox a restriction step naming this deployment\'s own domain (003 US-004)', () => {
    const step = PROVIDER_INFO.mapbox.restrictionStep
    expect(step).toBeDefined()
    const text = step!('https://example.test')
    expect(text).toContain('https://example.test')
    expect(text).toMatch(/url restriction/i)
    expect(text).toMatch(/dashboard|account\.mapbox\.com/i)
  })

  it('gives OpenRouteService no restriction step, since its key cannot be restricted (003 US-004)', () => {
    expect(PROVIDER_INFO.openrouteservice.restrictionStep).toBeUndefined()
  })
})
