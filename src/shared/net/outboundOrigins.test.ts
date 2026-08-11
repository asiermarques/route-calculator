// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { OUTBOUND_ORIGINS } from './outboundOrigins'

// These origins appear in source only as `<a href>` targets — the
// credentials screen's provider signup links (`providerInfo.ts`) and the
// tile attribution's copyright link (`shared/map/constants.ts`) — normal
// browser navigation the visitor triggers by clicking, not a request this
// app's own script makes. connect-src does not govern navigation, so they
// don't belong in OUTBOUND_ORIGINS.
const NAVIGATION_ONLY_ORIGINS = new Set([
  'https://www.mapbox.com',
  'https://account.mapbox.com',
  'https://openrouteservice.org',
  'https://www.openstreetmap.org',
])

const SRC_ROOT = join(__dirname, '..', '..')

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return collectSourceFiles(path)
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) return []
    return [path]
  })
}

function originOf(url: string): string {
  return url.match(/^https:\/\/[^/]+/)?.[0] ?? url
}

describe('the outbound origins the app requests cannot drift from OUTBOUND_ORIGINS (US-002)', () => {
  it('every https:// literal actually used to make a request resolves to a declared origin', () => {
    const offenders: string[] = []

    for (const file of collectSourceFiles(SRC_ROOT)) {
      const relativePath = file.slice(SRC_ROOT.length + 1)

      const text = readFileSync(file, 'utf-8')
      for (const match of text.matchAll(/https:\/\/[^\s'"`)]+/g)) {
        const origin = originOf(match[0])
        if (NAVIGATION_ONLY_ORIGINS.has(origin)) continue
        if (!(OUTBOUND_ORIGINS as readonly string[]).includes(origin)) {
          offenders.push(`${origin} (found in ${relativePath})`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('every declared origin is actually requested somewhere in the source, so the allowlist carries no dead entries', () => {
    const found = new Set<string>()

    for (const file of collectSourceFiles(SRC_ROOT)) {
      const text = readFileSync(file, 'utf-8')
      for (const match of text.matchAll(/https:\/\/[^\s'"`)]+/g)) {
        found.add(originOf(match[0]))
      }
    }

    const unused = OUTBOUND_ORIGINS.filter((origin) => !found.has(origin))
    expect(unused).toEqual([])
  })
})
