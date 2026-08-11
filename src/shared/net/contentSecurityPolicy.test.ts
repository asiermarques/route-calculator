import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from './contentSecurityPolicy'
import { MAPBOX_ORIGIN, NOMINATIM_ORIGIN, OPENROUTESERVICE_ORIGIN, OSM_TILE_ORIGIN_PATTERN } from './outboundOrigins'

describe('buildContentSecurityPolicy (US-001)', () => {
  const policy = buildContentSecurityPolicy()
  const directives = Object.fromEntries(
    policy
      .split(';')
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...sources] = directive.split(/\s+/)
        return [name, sources]
      }),
  )

  it('closes default-src', () => {
    expect(directives['default-src']).toEqual(["'none'"])
  })

  it('permits connect-src only to the app itself and the four outbound origins, nothing else', () => {
    expect(new Set(directives['connect-src'])).toEqual(
      new Set(["'self'", OSM_TILE_ORIGIN_PATTERN, NOMINATIM_ORIGIN, OPENROUTESERVICE_ORIGIN, MAPBOX_ORIGIN]),
    )
  })

  it('accommodates the wildcard tile host in img-src (EDGE-001)', () => {
    expect(directives['img-src']).toContain(OSM_TILE_ORIGIN_PATTERN)
  })

  it('never allows unsafe-inline script execution (RISK-001)', () => {
    expect(directives['script-src']).toBeDefined()
    expect(directives['script-src']).not.toContain("'unsafe-inline'")
    expect(policy).not.toContain('unsafe-inline')
  })

  it('locks down base-uri, object-src, form-action and frame-ancestors', () => {
    expect(directives['base-uri']).toEqual(["'self'"])
    expect(directives['object-src']).toEqual(["'none'"])
    expect(directives['form-action']).toEqual(["'none'"])
    expect(directives['frame-ancestors']).toEqual(["'none'"])
  })

  it('declares style-src', () => {
    expect(directives['style-src']).toBeDefined()
  })
})
