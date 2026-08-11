import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'

/** Every control sits on top of the map, absolutely positioned, so nothing in
 * the layout stops two of them landing on the same pixels. A control drawn
 * over another is unusable — the one underneath never receives the click.
 * Leaflet's own zoom buttons and attribution count: they are in the same
 * corners as the app's overlays and are just as easy to bury. */

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

for (const viewport of VIEWPORTS) {
  test(`overlay controls never cover each other on ${viewport.name}, error message included`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await mockTiles(page)
    await mockRouting(page, ['error'])
    await page.goto('/')

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
      ['undo', page.getByRole('button', { name: /^undo$/i })],
      ['clear', page.getByRole('button', { name: /^clear$/i })],
      ['zoom in', page.getByRole('button', { name: /zoom in/i })],
      ['zoom out', page.getByRole('button', { name: /zoom out/i })],
      ['attribution', page.locator('.leaflet-control-attribution')],
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
