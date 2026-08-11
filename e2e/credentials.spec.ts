import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

/** The credentials screen (US-001–US-004): a production build ships no
 * routing API key, so every visitor sees this screen before the map. */

test('a production build opens on the credentials screen, with no map, address search or drawing surface reachable (FR-001)', async ({
  page,
}) => {
  await mockTiles(page)
  await page.goto('/')

  await expect(page.getByRole('combobox', { name: /routing provider/i })).toBeVisible()
  await expect(page.locator('.leaflet-container')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: /address/i })).toHaveCount(0)
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
  await expect(page.locator('.leaflet-container')).toHaveCount(0)
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
  await expect(page.locator('.leaflet-container')).toHaveCount(0)
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

test('switching provider on the reopened screen clears the key field (BR-004, US-005)', async ({ page }) => {
  await mockTiles(page)
  await page.goto('/')
  await supplyCredentials(page, 'openrouteservice')

  await page.getByRole('button', { name: /change routing provider/i }).click()
  await page.getByLabel(/api key/i).fill('typed-but-not-submitted')
  await page.getByRole('combobox', { name: /routing provider/i }).selectOption('mapbox')

  await expect(page.getByLabel(/api key/i)).toHaveValue('')
})
