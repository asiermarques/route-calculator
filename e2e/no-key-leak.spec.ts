import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockNominatim } from './support/mock-nominatim'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

/** A failure never discloses the key or the request URL (003 US-005): a
 * screenshot of a failed request must not double as a leaked credential. A
 * distinctive key makes an accidental leak into a visible test failure
 * rather than a silent pass. */
const KEY = 'routes-e2e-distinctive-secret-1a2b3c'

test('a failed routing request shows an error, but neither the API key nor the request URL appears on the page or in the console', async ({
  page,
}) => {
  const consoleText: string[] = []
  page.on('console', (message) => consoleText.push(message.text()))

  await mockTiles(page)
  await mockRouting(page, ['error'])
  await page.goto('/')
  await supplyCredentials(page, 'openrouteservice', KEY)

  const box = (await page.locator('.leaflet-container').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)

  await expect(page.getByText(/could not find a route/i)).toBeVisible()

  const pageText = await page.locator('body').innerText()
  expect(pageText).not.toContain(KEY)
  expect(pageText).not.toContain('api.openrouteservice.org')
  expect(consoleText.join('\n')).not.toContain(KEY)
})

test('a failed geocoding request shows an error, but the request URL never appears on the page or in the console', async ({
  page,
}) => {
  const consoleText: string[] = []
  page.on('console', (message) => consoleText.push(message.text()))

  await mockTiles(page)
  await mockNominatim(page, { 'a private search query': 'error' })
  await page.goto('/')
  await supplyCredentials(page, 'openrouteservice', KEY)

  await page.getByRole('textbox', { name: /address/i }).fill('a private search query')
  await page.getByRole('button', { name: /search/i }).click()

  await expect(page.getByText(/error|unavailable/i)).toBeVisible()

  const pageText = await page.locator('body').innerText()
  expect(pageText).not.toContain('nominatim.openstreetmap.org')
  expect(pageText).not.toContain('a private search query')
  expect(consoleText.join('\n')).not.toContain(KEY)
})
