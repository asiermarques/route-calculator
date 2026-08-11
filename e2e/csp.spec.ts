import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockNominatim } from './support/mock-nominatim'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

/** The production Content-Security-Policy (003 US-001, US-002): a script
 * running on this origin is not by itself enough to send a visitor's routing
 * key anywhere else. Runs only against the real production build served by
 * `npm run preview` (`playwright.config.ts`) — this is the one place the
 * policy is actually in force; `npm run dev` deliberately ships without it. */

test('a production build declares a Content-Security-Policy whose connect-src permits only the app itself, the tile host, Nominatim and the two routing providers', async ({
  page,
}) => {
  await mockTiles(page)
  const response = await page.goto('/')
  const html = await response!.text()

  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)
  expect(match).not.toBeNull()

  const policy = match![1].replace(/&#39;/g, "'")
  const connectSrc = policy
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('connect-src'))!
    .split(/\s+/)
    .slice(1)

  expect(new Set(connectSrc)).toEqual(
    new Set([
      "'self'",
      'https://*.tile.openstreetmap.org',
      'https://nominatim.openstreetmap.org',
      'https://api.openrouteservice.org',
      'https://api.mapbox.com',
    ]),
  )
})

test('the shipped policy never contains unsafe-inline (RISK-001)', async ({ page }) => {
  await mockTiles(page)
  const response = await page.goto('/')
  const html = await response!.text()

  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)
  expect(match![1]).not.toContain('unsafe-inline')
})

test('a full journey — credentials, address search, waypoints and distance — works under the policy with no violation reported', async ({
  page,
}) => {
  // Distinct from a directive a <meta>-delivered policy can't carry at all
  // (`frame-ancestors` — Chrome logs that as an informational notice, not a
  // violation, every time; it would take effect if the policy were ever
  // delivered as a response header instead, ASM-001) — a real violation
  // names the directive it broke and says the load "has been blocked".
  const cspViolations: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('violates the following Content Security Policy directive')) {
      cspViolations.push(message.text())
    }
  })

  await mockTiles(page)
  await mockNominatim(page, { 'Eiffel Tower, Paris': [{ lat: '48.8584', lon: '2.2945' }] })
  await mockRouting(page, [{ distanceMeters: 1000 }])

  await page.goto('/')
  await supplyCredentials(page)

  await page.getByRole('textbox', { name: /address/i }).fill('Eiffel Tower, Paris')
  await page.getByRole('button', { name: /search/i }).click()
  await expect(page.locator('.leaflet-container')).toBeVisible()

  const box = (await page.locator('.leaflet-container').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)
  await expect(page.getByText('1.0 km')).toBeVisible()

  expect(cspViolations).toEqual([])
})

test('a request to a host outside the allowlist is blocked by the browser before any data leaves', async ({
  page,
}) => {
  await mockTiles(page)
  await page.goto('/')

  const result = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/')
      return 'not-blocked'
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })

  expect(result).not.toBe('not-blocked')
})
