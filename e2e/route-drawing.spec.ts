import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

async function mapBox(page: import('@playwright/test').Page) {
  const map = page.locator('.leaflet-container')
  return (await map.boundingBox())!
}

test('a single click places a waypoint and draws no path', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [])
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)

  await expect(page.locator('path[stroke="var(--color-route)"]')).toHaveCount(0)
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(1)
  await expect(page.getByText('0 km')).toBeVisible()
})

/** The hint over an empty map: the only thing that says the surface between
 * the two bars is where a route comes from. It has to say it without becoming
 * a control — one a visitor could hit instead of the map it is pointing at, or
 * one that stays there for the rest of the session. */

test('an empty map says how a route is started, and the click it asks for goes through it to the map', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, [])
  await page.goto('/')
  await supplyCredentials(page)

  const hint = page.getByText(/click the map to start your route/i)
  await expect(hint).toBeVisible()

  // Aimed at the hint itself, which sits over the middle of the map: it takes
  // no clicks, so this lands on the map and does the very thing it asks for.
  const pill = (await hint.boundingBox())!
  await page.mouse.click(pill.x + pill.width / 2, pill.y + pill.height / 2)

  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(1)
  // And having been acted on, it is gone rather than left over the route.
  await expect(hint).toHaveCount(0)
})

test('the hint leaves on its own, and does not come back when the route is cleared', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  const hint = page.getByText(/click the map to start your route/i)
  await expect(hint).toBeVisible()
  await expect(hint).toHaveCount(0, { timeout: 15_000 })

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)
  await expect(page.getByText('1.0 km')).toBeVisible()
  await page.getByRole('button', { name: /^clear$/i }).click()

  // An empty map again, but not a first-time visitor: someone who has drawn
  // and cleared a route knows how one is drawn.
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(0)
  await expect(hint).toHaveCount(0)
})

test('a second click on a routable street draws a snapped path and updates the distance', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1200 }])
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)

  await expect(page.getByText('1.2 km')).toBeVisible()
  // Waypoints and the path are both drawn, as visually distinct layers.
  await expect(page.locator('path[stroke="var(--color-route)"]')).toHaveCount(1)
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(2)
})

test('a further click appends a new segment to the end of the route', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }, { distanceMeters: 500 }])
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(page.getByText('1.0 km')).toBeVisible()

  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
  await expect(page.getByText('1.5 km')).toBeVisible()
})

test('clicking somewhere no route can reach shows an error and leaves the route at one waypoint', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, ['not-found'])
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)

  await expect(page.getByText(/could not find a route/i)).toBeVisible()
  await expect(page.getByText('0 km')).toBeVisible()
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(1) // only the first waypoint
  await expect(page.locator('path[stroke="var(--color-route)"]')).toHaveCount(0)
})

test('a routing provider outage shows an error and leaves the route unchanged', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, ['error'])
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)

  await expect(page.getByText(/could not find a route/i)).toBeVisible()
  await expect(page.getByText('0 km')).toBeVisible()
})

test('a slow routing response shows in-progress feedback instead of looking like a dead click', async ({
  page,
}) => {
  await mockTiles(page)
  const map = page.locator('.leaflet-container')
  await page.route('https://api.openrouteservice.org/v2/directions/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const body = JSON.parse(route.request().postData() ?? '{}') as { coordinates: [number, number][] }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            geometry: { coordinates: body.coordinates },
            properties: { summary: { distance: 900 } },
          },
        ],
      }),
    })
  })
  await page.goto('/')
  await supplyCredentials(page)

  const box = (await map.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)

  // The live region and not just the words: the change-provider button now
  // carries its own name on screen ("Change routing provider"), so a bare text
  // match on /routing/i has two candidates.
  await expect(page.getByRole('status').filter({ hasText: /routing/i })).toBeVisible()
  await expect(page.getByText('0.9 km')).toBeVisible()
})

test('clicking two points in quick succession draws the route in click order regardless of response order', async ({
  page,
}) => {
  await mockTiles(page)
  let firstRequestSeen = false
  await page.route('https://api.openrouteservice.org/v2/directions/**', async (route) => {
    const isFirstSegment = !firstRequestSeen
    firstRequestSeen = true
    // The first segment's response is slower than the second's, so if the
    // app didn't preserve click order the second segment would land first.
    if (isFirstSegment) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            geometry: { coordinates: [[0, 0], [1, 1]] },
            properties: { summary: { distance: isFirstSegment ? 1000 : 500 } },
          },
        ],
      }),
    })
  })
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)

  await expect(page.getByText('1.5 km')).toBeVisible()
})
