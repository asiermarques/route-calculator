import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

/** The credentials screen (US-001–US-004): a production build ships no
 * routing API key, so every visitor sees this screen before the map. */

test('a production build opens on the credentials screen, with no address search or drawing surface reachable (FR-001)', async ({
  page,
}) => {
  await mockTiles(page)
  await page.goto('/')

  await expect(page.getByRole('combobox', { name: /routing provider/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /address/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /add waypoint/i })).toHaveCount(0)
})

test('the map behind the credentials screen is scenery: visible, but answering nothing (FR-001)', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')

  // It is drawn — the screen is a veil over the thing the visitor came for,
  // not a black rectangle in front of nothing (docs/DESIGN.md) …
  const map = page.locator('.leaflet-container')
  await expect(map).toBeVisible()

  // … and it is inert: a click at the middle of the screen reaches the veil
  // and stops there, rather than placing a waypoint on the map underneath.
  const box = (await map.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.25)
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(0)

  // Nor can the keyboard get to it: Leaflet gives its container a tab stop of
  // its own for the arrow-key pan, which behind a modal would be a way into
  // the app the screen is supposed to be holding shut.
  await expect(map).toHaveAttribute('tabindex', '0')
  await map.focus()
  await expect(map).not.toBeFocused()
})

test('selecting a provider and entering a key reveals the map and behaves as usual (US-001)', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  await expect(page.locator('.leaflet-container')).toBeVisible()

  const box = (await page.locator('.leaflet-container').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)
  await expect(page.getByText('1.0 km')).toBeVisible()
})

test('submitting an empty key keeps the screen and explains what is missing (EDGE-003)', async ({ page }) => {
  await mockTiles(page)
  await page.goto('/')

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('openrouteservice')
  await page.getByRole('button', { name: /continue/i }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('combobox', { name: /routing provider/i })).toBeVisible()
})

test('submitting a whitespace-only key keeps the screen too (EDGE-003)', async ({ page }) => {
  await mockTiles(page)
  await page.goto('/')

  await page.getByLabel(/api key/i).fill('   ')
  await page.getByRole('button', { name: /continue/i }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  // The app's own controls, not the map: the map is the backdrop this screen
  // is shown over from the first load, so its presence says nothing about
  // whether the app behind it has been unlocked.
  await expect(page.getByRole('textbox', { name: /address/i })).toHaveCount(0)
})

test('reloading after supplying credentials returns to the credentials screen with the key gone (BR-001)', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, [])
  await page.goto('/')
  await supplyCredentials(page)
  await expect(page.locator('.leaflet-container')).toBeVisible()

  await page.reload()

  await expect(page.getByRole('combobox', { name: /routing provider/i })).toBeVisible()
  await expect(page.getByLabel(/api key/i)).toHaveValue('')
  await expect(page.getByRole('textbox', { name: /address/i })).toHaveCount(0)
})

test('no routing API key is ever present in any browser storage (BR-001)', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page, 'openrouteservice', 'never-persisted-key')

  const box = (await page.locator('.leaflet-container').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)
  await expect(page.getByText('1.0 km')).toBeVisible()

  const found = await page.evaluate(async () => {
    const needle = 'never-persisted-key'
    const haystacks: string[] = [JSON.stringify(localStorage), JSON.stringify(sessionStorage), document.cookie]

    const dbs = (await indexedDB.databases?.()) ?? []
    for (const db of dbs) haystacks.push(JSON.stringify(db))

    return haystacks.some((store) => store.includes(needle))
  })

  expect(found).toBe(false)
})

test('the instructions change with the selected provider, leaving none of the other provider\'s steps behind (US-003)', async ({
  page,
}) => {
  await mockTiles(page)
  await page.goto('/')

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('mapbox')
  await expect(page.getByRole('link', { name: /account\.mapbox\.com/ })).toBeVisible()

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('openrouteservice')
  await expect(page.getByRole('link', { name: /account\.mapbox\.com/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /openrouteservice\.org/ }).first()).toBeVisible()
})

test('the screen states the key is not stored, not sent to the operator, and should be domain-restricted (US-004)', async ({
  page,
}) => {
  await mockTiles(page)
  await page.goto('/')

  await expect(page.getByText(/stays in this browser/i)).toBeVisible()
  await expect(page.getByText(/no.*remember me/i)).toBeVisible()
  await expect(page.getByText(/restrict/i)).toBeVisible()
})

/** Reopening the credentials screen from the running app (US-005). */

test('reopening with a different provider takes effect for the next routing request, with no page reload, and leaves the drawn route unchanged (US-005)', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page, 'openrouteservice')

  const box = (await page.locator('.leaflet-container').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(page.getByText('1.0 km')).toBeVisible()

  let mapboxRequests = 0
  await page.route('https://api.mapbox.com/directions/**', async (route) => {
    mapboxRequests++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        routes: [{ geometry: { coordinates: [[0, 0], [1, 1]] }, distance: 700 }],
      }),
    })
  })

  await page.getByRole('button', { name: /change routing provider/i }).click()
  await supplyCredentials(page, 'mapbox', 'mapbox-e2e-key')

  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)

  await expect(page.getByText('1.7 km')).toBeVisible()
  expect(mapboxRequests).toBeGreaterThan(0)
  // No reload happened: the waypoints from before the switch are still there.
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(3)
})

test('reopening after a key the provider rejects lets the next waypoint route successfully (US-005)', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, ['error', { distanceMeters: 900 }])
  await page.goto('/')
  await supplyCredentials(page, 'openrouteservice', 'bad-key')

  const box = (await page.locator('.leaflet-container').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(page.getByText(/could not find a route/i)).toBeVisible()

  await page.getByRole('button', { name: /change routing provider/i }).click()
  await supplyCredentials(page, 'openrouteservice', 'working-key')

  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)

  await expect(page.getByText('0.9 km')).toBeVisible()
})

test('dismissing the reopened screen without changing anything leaves the current credentials in place (US-005)', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 500 }, { distanceMeters: 300 }])
  await page.goto('/')
  await supplyCredentials(page)

  const box = (await page.locator('.leaflet-container').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(page.getByText('0.5 km')).toBeVisible()

  await page.getByRole('button', { name: /change routing provider/i }).click()
  await expect(page.getByRole('combobox', { name: /routing provider/i })).toBeVisible()
  await page.getByRole('button', { name: /cancel/i }).click()

  await expect(page.getByRole('combobox', { name: /routing provider/i })).toHaveCount(0)
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
  await expect(page.getByText('0.8 km')).toBeVisible()
})

/** Provider-specific security guidance (003 US-003, US-004): a visitor
 * choosing a provider learns whether the key they're about to paste can be
 * protected, and how. */

test('OpenRouteService is warned, before the key is typed, that its key cannot be restricted and what a leak costs (003 US-003)', async ({
  page,
}) => {
  await mockTiles(page)
  await page.goto('/')

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('openrouteservice')

  await expect(page.getByText(/cannot be restricted/i)).toBeVisible()
  await expect(page.getByText(/usable from anywhere/i)).toBeVisible()
  await expect(page.getByText(/blocked/i)).toBeVisible()
})

test('switching away from OpenRouteService drops its warning (003 US-003 AC2)', async ({ page }) => {
  await mockTiles(page)
  await page.goto('/')

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('openrouteservice')
  await expect(page.getByText(/cannot be restricted/i)).toBeVisible()

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('mapbox')
  await expect(page.getByText(/cannot be restricted/i)).toHaveCount(0)
})

test('an OpenRouteService key is still accepted despite the warning (003 US-003 AC3)', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page, 'openrouteservice')

  await expect(page.locator('.leaflet-container')).toBeVisible()
})

test('Mapbox is told to restrict its token\'s allowed URLs to this app\'s own domain, and where (003 US-004)', async ({
  page,
}) => {
  await mockTiles(page)
  await page.goto('/')

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('mapbox')

  const restrictionStep = page.getByText(/url restriction/i)
  await expect(restrictionStep).toBeVisible()
  await expect(restrictionStep).toContainText('account.mapbox.com')
  const origin = await page.evaluate(() => window.location.origin)
  await expect(restrictionStep).toContainText(origin)
})

test('switching away from Mapbox drops its restriction step (003 US-004 AC3)', async ({ page }) => {
  await mockTiles(page)
  await page.goto('/')

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('mapbox')
  await expect(page.getByText(/url restriction/i)).toBeVisible()

  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('openrouteservice')
  await expect(page.getByText(/url restriction/i)).toHaveCount(0)
})

test('switching provider on the reopened screen clears the key field (BR-004, US-005)', async ({ page }) => {
  await mockTiles(page)
  await page.goto('/')
  await supplyCredentials(page, 'openrouteservice')

  await page.getByRole('button', { name: /change routing provider/i }).click()
  await page.getByLabel(/api key/i).fill('typed-but-not-submitted')
  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('mapbox')

  await expect(page.getByLabel(/api key/i)).toHaveValue('')
})
