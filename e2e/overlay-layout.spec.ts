import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

/** Every control sits on top of the map, absolutely positioned, so nothing in
 * the layout stops two of them landing on the same pixels. A control drawn
 * over another is unusable — the one underneath never receives the click.
 * The controls now live in two bars — a header and a footer — so most of this
 * is about the bars themselves staying clear of each other and of Leaflet's
 * attribution, which is the last thing left floating in a corner of the map. */

type Box = { x: number; y: number; width: number; height: number }

function overlaps(a: Box, b: Box) {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  )
}

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 700 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

/** What is under a point of the viewport: the map itself, or something drawn
 * over it. `elementFromPoint` answers the same question a click does. */
async function coveringTheMapAt(page: Page, x: number, y: number) {
  return await page.evaluate(
    ([px, py]) => {
      const element = document.elementFromPoint(px, py)
      return element?.closest('footer, header') ? 'an overlay' : 'the map'
    },
    [x, y],
  )
}

test('on a wide screen the footer is two panels with map between them, not one bar across the bottom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  const clear = (await page.getByRole('button', { name: /^clear$/i }).boundingBox())!
  const zoomOut = (await page.getByRole('button', { name: /zoom out/i }).boundingBox())!

  // The controls occupy a third of a laptop's width; a single bar spanning the
  // rest is a curtain drawn over the thing the app exists to show.
  expect(zoomOut.x - (clear.x + clear.width)).toBeGreaterThan(400)

  // And what shows through between them is map in both senses: it is drawn
  // there, and a click there reaches it. The strip the two panels are placed
  // in still spans the width, and an invisible strip that answers clicks is
  // the same lost map with none of the honesty.
  const middle = { x: 640, y: clear.y + clear.height / 2 }
  expect(await coveringTheMapAt(page, middle.x, middle.y)).toBe('the map')
  await page.mouse.click(middle.x, middle.y)
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(1)
})

test('on a phone the footer stays a single bar, with every control inside it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  // Two panels and a gap is a wide-screen luxury: at 375px there is no width
  // to spend on the gap, and the controls need the edges. What there *is* room
  // for is getting them all inside the panel — the zoom pair used to hang over
  // its right edge, on a bar that draws its own border around itself.
  const bar = (await page.locator('footer').boundingBox())!
  for (const name of [/add waypoint/i, /remove last waypoint/i, /^clear$/i, /zoom in/i, /zoom out/i]) {
    const control = (await page.getByRole('button', { name }).boundingBox())!
    expect(control.x, `${name} starts left of the bar`).toBeGreaterThanOrEqual(bar.x)
    expect(
      control.x + control.width,
      `${name} runs past the right edge of the bar`,
    ).toBeLessThanOrEqual(bar.x + bar.width)
  }
})

for (const viewport of VIEWPORTS) {
  test(`overlay controls never cover each other on ${viewport.name}, error message included`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await mockTiles(page)
    await mockRouting(page, ['error'])
    await page.goto('/')
    await supplyCredentials(page)

    // Provoke the widest overlay state: the routing error panel, on screen at
    // the same time as every other control.
    const map = (await page.locator('.leaflet-container').boundingBox())!
    await page.mouse.click(map.x + map.width * 0.4, map.y + map.height * 0.4)
    await page.mouse.click(map.x + map.width * 0.6, map.y + map.height * 0.5)
    await expect(page.getByText(/could not find a route/i)).toBeVisible()

    const named: Array<[string, Box]> = []
    for (const [name, locator] of [
      ['search', page.getByRole('textbox', { name: /address/i })],
      ['distance', page.getByRole('status').filter({ hasText: /km/ })],
      ['routing status', page.getByRole('status').filter({ hasText: /could not find/i })],
      ['add waypoint', page.getByRole('button', { name: /add waypoint/i })],
      ['undo', page.getByRole('button', { name: /remove last waypoint/i })],
      ['clear', page.getByRole('button', { name: /^clear$/i })],
      ['zoom in', page.getByRole('button', { name: /zoom in/i })],
      ['zoom out', page.getByRole('button', { name: /zoom out/i })],
      ['attribution', page.locator('.leaflet-control-attribution')],
      ['change routing provider', page.getByRole('button', { name: /change routing provider/i })],
    ] as const) {
      const box = await locator.boundingBox()
      expect(box, `${name} should be laid out`).not.toBeNull()
      named.push([name, box!])
    }

    for (let i = 0; i < named.length; i++) {
      for (let j = i + 1; j < named.length; j++) {
        const [nameA, a] = named[i]
        const [nameB, b] = named[j]
        expect(overlaps(a, b), `${nameA} overlaps ${nameB}`).toBe(false)
      }
    }
  })
}
