import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'
import {
  denyGeolocation,
  grantGeolocation,
  removeGeolocationApi,
  stubGeolocationAutoSucceedsThenHangs,
  stubGeolocationError,
  stubGeolocationHang,
} from './support/mock-geolocation'

/** A point far from the default view (Madrid), so a successful locate clearly
 * requests different tiles — the same trick `address-search.spec.ts` uses to
 * prove the map actually moved. */
const VISITOR_POSITION = { latitude: 48.8584, longitude: 2.2945 } // Eiffel Tower, Paris
const SECOND_POSITION = { latitude: 51.5007, longitude: -0.1246 } // Big Ben, London

test.describe('the map locates the visitor automatically once it is usable', () => {
  test('the map centres on the visitor\'s position with no press at all (FR-002, FR-003)', async ({
    page,
  }) => {
    const tiles = await mockTiles(page)
    await grantGeolocation(page, VISITOR_POSITION)
    await page.goto('/')

    // Credentials, not a press, are what makes the map usable — and that is
    // the one event the automatic reading waits for.
    await supplyCredentials(page)

    // `MATCH_ZOOM` (16) is street level; the map's own default (`DEFAULT_ZOOM`,
    // 14) never requests it on its own — so a zoom-16 tile is proof the
    // automatic reading moved the map, with nothing pressed to ask for it.
    await expect.poll(() => tiles.some((t) => t.z === 16), { timeout: 5000 }).toBe(true)

    // Positioning, not drawing (BR-001, requisites Summary): no waypoint was
    // placed by it.
    expect(await page.locator('path[fill="var(--color-waypoint)"]').count()).toBe(0)
  })

  test('there is no locate reading, and no permission prompt, while the credentials screen still gates the app (FR-001)', async ({
    page,
  }) => {
    await mockTiles(page)
    await grantGeolocation(page, VISITOR_POSITION)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /draw a route/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /locate/i })).not.toBeVisible()
  })

  test('a refused, unavailable or slow automatic reading fails silently: no alert, map stays on its default view (FR-005)', async ({
    page,
  }) => {
    const tiles = await mockTiles(page)
    await denyGeolocation(page)
    await page.goto('/')
    await supplyCredentials(page)
    await expect.poll(() => tiles.length, { timeout: 5000 }).toBeGreaterThan(0)

    // Nothing was ever pressed, so nothing is shown for the failure, and the
    // map never reached street level (`MATCH_ZOOM`) — it stayed on the
    // default view's own zoom.
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(tiles.every((t) => t.z !== 16)).toBe(true)

    // The control itself is unaffected: idle and ready for a real press.
    await expect(page.getByRole('button', { name: /locate/i })).toBeEnabled()
  })
})

test.describe('pressing the control (US-001–US-003)', () => {
  test('re-centres the map on a fresh reading (FR-002, FR-003)', async ({ page }) => {
    const tiles = await mockTiles(page)
    await grantGeolocation(page, VISITOR_POSITION)
    await page.goto('/')
    await supplyCredentials(page)
    await expect.poll(() => tiles.length, { timeout: 5000 }).toBeGreaterThan(0)
    const tilesBeforePress = [...tiles]

    // A different position from the one the automatic reading already used,
    // so a press that does nothing new can't hide behind an unmoved map.
    await grantGeolocation(page, SECOND_POSITION)
    await page.getByRole('button', { name: /locate/i }).click()

    await expect.poll(() => tiles.length, { timeout: 5000 }).toBeGreaterThan(tilesBeforePress.length)
    const newTiles = tiles.slice(tilesBeforePress.length)
    expect(newTiles.some((t) => t.x !== tilesBeforePress[0].x || t.y !== tilesBeforePress[0].y)).toBe(
      true,
    )
  })

  test('locating with a route already drawn leaves every waypoint, segment and the distance exactly as they were (BR-002, EDGE-005)', async ({
    page,
  }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1200 }])
    await grantGeolocation(page, VISITOR_POSITION)
    await page.goto('/')
    await supplyCredentials(page)

    const map = (await page.locator('.leaflet-container').boundingBox())!
    await page.mouse.click(map.x + map.width * 0.4, map.y + map.height * 0.4)
    await page.mouse.click(map.x + map.width * 0.6, map.y + map.height * 0.5)
    await expect(page.getByText('1.2 km')).toBeVisible()
    const waypointsBefore = await page.locator('path[fill="var(--color-waypoint)"]').count()

    await grantGeolocation(page, SECOND_POSITION)
    await page.getByRole('button', { name: /locate/i }).click()

    // The map has moved away from the route, but the route hasn't moved at all.
    await expect(page.getByText('1.2 km')).toBeVisible()
    expect(await page.locator('path[fill="var(--color-waypoint)"]').count()).toBe(waypointsBefore)
  })

  test('a press while a reading is in flight starts no second one (FR-004, EDGE-006)', async ({ page }) => {
    await mockTiles(page)
    await stubGeolocationAutoSucceedsThenHangs(page)
    await page.goto('/')
    await supplyCredentials(page)

    const button = page.getByRole('button', { name: /locate/i })
    // The automatic reading already resolved (the stub's first call), so the
    // control starts this part of the spec idle and enabled.
    await expect(button).toBeEnabled()

    await button.click()
    await expect(page.getByRole('status').filter({ hasText: /finding your position/i })).toBeVisible()
    await expect(button).toBeDisabled()

    await button.click({ force: true })
    // Still exactly one in-flight announcement — a second press made no second
    // request, and the control still says it is working.
    await expect(page.getByRole('status').filter({ hasText: /finding your position/i })).toBeVisible()
  })

  test('the control is reachable and operable from the keyboard, and announces that it is working (FR-007)', async ({
    page,
  }) => {
    await mockTiles(page)
    await stubGeolocationAutoSucceedsThenHangs(page)
    await page.goto('/')
    await supplyCredentials(page)

    const button = page.getByRole('button', { name: /locate/i })
    await expect(button).toBeEnabled()

    await button.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('status').filter({ hasText: /finding your position/i })).toBeVisible()
  })

  test('a refused permission is stated plainly, without promising the app can ask again, and the map stays put (FR-005, FR-006, EDGE-001)', async ({
    page,
  }) => {
    const tiles = await mockTiles(page)
    await denyGeolocation(page)
    await page.goto('/')
    await supplyCredentials(page)
    await expect.poll(() => tiles.length, { timeout: 5000 }).toBeGreaterThan(0)
    const tilesBefore = tiles.length

    await page.getByRole('button', { name: /locate/i }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(/permission/i)
    await expect(alert).not.toContainText(/we('| wi)ll ask|automatically/i)
    expect(tiles.length).toBe(tilesBefore)

    // FR-006: the app doesn't treat the refusal as final — pressing again asks
    // again (Playwright answers with the same denial, no real prompt either
    // time), and the same message is shown, still true on a second reading.
    await page.getByRole('button', { name: /locate/i }).click()
    await expect(page.getByRole('alert')).toContainText(/permission/i)
  })

  test('an unavailable position gets its own message, distinct from a refusal (EDGE-002)', async ({ page }) => {
    await mockTiles(page)
    await stubGeolocationError(page, 2) // POSITION_UNAVAILABLE
    await page.goto('/')
    await supplyCredentials(page)

    // The automatic reading already failed the same way, silently — pressing
    // is what turns the same failure into a message.
    await page.getByRole('button', { name: /locate/i }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).not.toContainText(/permission/i)
  })

  test('a reading that never answers gives up after a bounded wait and says it took too long (FR-005, EDGE-003)', async ({
    page,
  }) => {
    test.slow() // waits out the app's own bounded wait for real
    const tiles = await mockTiles(page)
    await stubGeolocationAutoSucceedsThenHangs(page)
    await page.goto('/')
    await supplyCredentials(page)
    await expect.poll(() => tiles.length, { timeout: 5000 }).toBeGreaterThan(0)

    const button = page.getByRole('button', { name: /locate/i })
    await expect(button).toBeEnabled()
    const tilesBefore = tiles.length

    await button.click()

    await expect(page.getByRole('alert')).toContainText(/too long/i, { timeout: 15_000 })
    expect(tiles.length).toBe(tilesBefore)

    // The control gave its in-flight state back, so a fresh press tries again.
    await expect(button).toBeEnabled()
  })
})

const WIDTHS = [
  { name: 'phone', width: 375, height: 700 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

for (const viewport of WIDTHS) {
  test(`no control is offered where the browser exposes no Geolocation API, and the header still lays out correctly on ${viewport.name} (US-004)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await mockTiles(page)
    await removeGeolocationApi(page)
    await page.goto('/')
    await supplyCredentials(page)

    await expect(page.getByRole('textbox', { name: /address/i })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: /km/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /locate/i })).toHaveCount(0)
  })
}
