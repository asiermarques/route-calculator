import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

/** The app is one full-viewport map with everything else floating on top of
 * it, which is a layout that degrades quietly rather than loudly: nothing
 * reflows or errors on a small screen, controls just become too small to hit
 * and panels overflow off the edges where no scrollbar can reach them.
 * `overlay-layout.spec.ts` covers overlays landing on each other; this covers
 * whether a person holding a phone can actually operate what it lays out.
 *
 * Emulates touch as well as size: waypoint markers are drawn at a size chosen
 * from `(pointer: coarse)`, so a narrow viewport alone would test the desktop
 * marker at phone dimensions. */
test.use({ hasTouch: true, isMobile: true, viewport: { width: 393, height: 727 } })

/** Below this, a control is smaller than the part of the screen a fingertip
 * actually covers, and hitting it becomes a matter of aim. */
const MIN_TOUCH_TARGET = 44

/** The waypoint dots, and not the route line drawn between them: both are
 * Leaflet vector layers in the same SVG, and the line's bounding box spans the
 * whole route, so it would answer first to a plain path selector. Leaflet
 * renders an unfilled shape with a literal `fill="none"`, which is the one
 * attribute that separates the line from the dots. */
const WAYPOINT_MARKER = 'path.leaflet-interactive:not([fill="none"])'

/** The centre of a waypoint dot, once Leaflet has finished placing it.
 * Leaflet repositions the SVG the vector layers live in as the drawn route
 * grows, and for a frame after that the dots report where they used to be — a
 * tap aimed at a position read in that window lands on the map instead of on
 * the waypoint. Two readings that agree mean the map has settled. */
async function settledMarkerCentre(page: Page, index = 0) {
  let previous: string | null = null
  return await expect
    .poll(async () => {
      const box = await page.locator(WAYPOINT_MARKER).nth(index).boundingBox()
      const current = JSON.stringify(box)
      const settled = current === previous ? box : null
      previous = current
      return settled
    })
    .not.toBeNull()
    .then(async () => {
      const box = (await page.locator(WAYPOINT_MARKER).nth(index).boundingBox())!
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width }
    })
}

const PHONE_VIEWPORTS = [
  { name: 'small phone, portrait', width: 360, height: 640 },
  { name: 'phone, portrait', width: 393, height: 727 },
  { name: 'phone, landscape', width: 740, height: 360 },
]

/** Every control the app itself draws, once the map is up. Leaflet's own zoom
 * buttons are deliberately absent: their size is Leaflet's to set, and this
 * suite doesn't restyle third-party controls. */
function appControls(page: Page) {
  return [
    page.getByRole('textbox', { name: /address/i }),
    page.getByRole('button', { name: /^search$/i }),
    page.getByRole('button', { name: /add waypoint/i }),
    page.getByRole('button', { name: /remove last waypoint/i }),
    page.getByRole('button', { name: /^clear$/i }),
    page.getByRole('button', { name: /change routing provider/i }),
  ]
}

test.describe('credentials screen on a phone', () => {
  for (const viewport of PHONE_VIEWPORTS) {
    test(`is readable end to end on a ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await mockTiles(page)
      await page.goto('/')

      // The form is taller than a phone screen, so it has to scroll — and a
      // form centred along an axis it overflows spills past *both* ends of its
      // scroll container, leaving the top permanently out of reach. The
      // heading is the first thing a visitor needs and the first thing lost.
      const heading = page.getByRole('heading', { name: /connect a routing provider/i })
      await expect(heading).toBeInViewport()
      const box = (await heading.boundingBox())!
      expect(box.y, 'the heading starts above the top of the screen').toBeGreaterThanOrEqual(0)

      // And the far end is reachable by scrolling, rather than cut off below.
      const submit = page.getByRole('button', { name: /continue/i })
      await submit.scrollIntoViewIfNeeded()
      await expect(submit).toBeInViewport()
    })
  }

  test('its fields and buttons are big enough to hit with a finger', async ({ page }) => {
    await mockTiles(page)
    await page.goto('/')

    for (const control of [
      page.getByRole('combobox', { name: /routing provider/i }),
      page.getByLabel(/api key/i),
      page.getByRole('button', { name: /continue/i }),
    ]) {
      const box = (await control.boundingBox())!
      expect(box.height, `${await control.textContent()} is too short to tap`).toBeGreaterThanOrEqual(
        MIN_TOUCH_TARGET,
      )
    }
  })

  test('focusing a field does not make mobile Safari zoom the page in', async ({ page }) => {
    await mockTiles(page)
    await page.goto('/')

    // Mobile Safari zooms in on any focused field whose text is under 16px and
    // does not zoom back out afterwards, which on a full-viewport map strands
    // the visitor at a scale they never asked for. There is no way to observe
    // that zoom from here, so this asserts the condition that triggers it.
    for (const field of [
      page.getByRole('combobox', { name: /routing provider/i }),
      page.getByLabel(/api key/i),
    ]) {
      const fontSize = await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      expect(fontSize).toBeGreaterThanOrEqual(16)
    }
  })
})

test.describe('map controls on a phone', () => {
  test('every control is big enough to hit with a finger', async ({ page }) => {
    await mockTiles(page)
    await page.goto('/')
    await supplyCredentials(page)

    for (const control of appControls(page)) {
      const box = (await control.boundingBox())!
      const label = await control.getAttribute('aria-label')
      expect(box.height, `${label ?? await control.textContent()} is too short to tap`).toBeGreaterThanOrEqual(
        MIN_TOUCH_TARGET,
      )
    }
  })

  test('the address field does not trigger a zoom-in on focus', async ({ page }) => {
    await mockTiles(page)
    await page.goto('/')
    await supplyCredentials(page)

    const fontSize = await page
      .getByRole('textbox', { name: /address/i })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(fontSize).toBeGreaterThanOrEqual(16)
  })

  test('the search field and its button share one row', async ({ page }) => {
    await mockTiles(page)
    await page.goto('/')
    await supplyCredentials(page)

    // The bar is absolutely positioned, so it sizes to its contents — and a
    // wrapping flex container sizes to its widest *item*, not to a row. Left
    // alone it comes out only as wide as the field and drops the button onto a
    // second line, spending scarce vertical space and burying the button in a
    // corner of the map.
    const field = (await page.getByRole('textbox', { name: /address/i }).boundingBox())!
    const button = (await page.getByRole('button', { name: /^search$/i }).boundingBox())!

    expect(button.x, 'the search button wrapped below the field').toBeGreaterThan(field.x)
    expect(Math.abs(button.y - field.y)).toBeLessThan(field.height)
  })
})

test.describe('drawing a route by touch', () => {
  test('a tap places a waypoint, and tapping it back opens its options', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1200 }])
    await page.goto('/')
    await supplyCredentials(page)

    const map = (await page.locator('.leaflet-container').boundingBox())!
    const first = { x: map.x + map.width * 0.35, y: map.y + map.height * 0.45 }
    await page.touchscreen.tap(first.x, first.y)
    await page.touchscreen.tap(map.x + map.width * 0.65, map.y + map.height * 0.6)
    await expect(page.getByRole('status').filter({ hasText: '1.2 km' })).toBeVisible()

    // Tapping the first waypoint back: the route line now runs through it, and
    // that line is a sibling vector layer covering the same pixels, which must
    // not intercept a tap meant for the dot drawn over it.
    const marker = await settledMarkerCentre(page)
    await page.touchscreen.tap(marker.x, marker.y)

    await expect(page.getByRole('group', { name: /waypoint options/i })).toBeVisible()
    expect(await page.locator(WAYPOINT_MARKER).count(), 'a third waypoint was added').toBe(2)
  })

  test('a tap that lands slightly off a waypoint still opens its options', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1200 }])
    await page.goto('/')
    await supplyCredentials(page)

    const map = (await page.locator('.leaflet-container').boundingBox())!
    await page.touchscreen.tap(map.x + map.width * 0.4, map.y + map.height * 0.5)

    // A waypoint is a Leaflet vector layer, hit-tested against exactly the
    // circle it paints — there is no invisible padding around it — so the
    // drawn size *is* the tap target.
    const marker = await settledMarkerCentre(page)
    expect(marker.width, 'the waypoint is drawn too small to tap').toBeGreaterThanOrEqual(20)

    // Nobody taps a marker dead centre. A miss by a few pixels places a *new*
    // waypoint instead of editing the one aimed at — a silent wrong action,
    // not a no-op, which is what makes the target size worth asserting.
    await page.touchscreen.tap(marker.x + 6, marker.y + 6)

    await expect(page.getByRole('group', { name: /waypoint options/i })).toBeVisible()
    expect(await page.locator(WAYPOINT_MARKER).count()).toBe(1)
  })

  test('the options panel opens fully on screen, not off the edge of the map', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1200 }])
    await page.goto('/')
    await supplyCredentials(page)

    // A waypoint near a corner: the panel anchors toward the middle of the map
    // so it grows inward rather than off the side it is closest to.
    const map = (await page.locator('.leaflet-container').boundingBox())!
    await page.touchscreen.tap(map.x + map.width - 30, map.y + map.height * 0.3)

    const marker = await settledMarkerCentre(page)
    await page.touchscreen.tap(marker.x, marker.y)

    const panel = page.getByRole('group', { name: /waypoint options/i })
    await expect(panel).toBeVisible()
    const box = (await panel.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(map.width)
    expect(box.y + box.height).toBeLessThanOrEqual(map.height)

    for (const name of [/delete/i, /^move$/i]) {
      const button = (await panel.getByRole('button', { name }).boundingBox())!
      expect(button.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
    }
  })
})
