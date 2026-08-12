import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

/** What the keyboard can and cannot reach.
 *
 * Placing a waypoint is a click on the map, and there is no keyboard
 * equivalent: the control that dropped one at the map's centre was removed as
 * unnecessary, and with it the way to draw a route without a pointer. What the
 * keyboard still has is the map itself — Leaflet's arrow-key pan — and every
 * control in the two bars, including the two that take a route back apart. */

function panePosition(page: Page) {
  return page.evaluate(() => {
    const pane = document.querySelector('.leaflet-map-pane') as HTMLElement
    return getComputedStyle(pane).transform
  })
}

/** Pans the map with the arrow keys and waits for it to come to rest. Leaflet
 * animates the pan frame by frame, so the new centre is not readable the
 * instant the key goes down. */
async function panWithKeyboard(page: Page, ...keys: string[]) {
  const before = await panePosition(page)
  await page.locator('.leaflet-container').focus()
  for (const key of keys) {
    await page.keyboard.press(key)
  }

  let previous = ''
  await expect
    .poll(async () => {
      const current = await panePosition(page)
      const settled = current !== before && current === previous
      previous = current
      return settled
    })
    .toBe(true)
}

/** Draws a two-waypoint route with the mouse, which is the only way to draw
 * one. The keyboard assertions below start from a route that already exists. */
async function drawRoute(page: Page) {
  const map = (await page.locator('.leaflet-container').boundingBox())!
  await page.mouse.click(map.x + map.width * 0.4, map.y + map.height * 0.4)
  await page.mouse.click(map.x + map.width * 0.6, map.y + map.height * 0.5)
  await expect(page.getByText('1.4 km')).toBeVisible()
}

test('the map itself is reachable from the keyboard and pans with the arrow keys', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, [])
  await page.goto('/')
  await supplyCredentials(page)

  await panWithKeyboard(page, 'ArrowRight', 'ArrowDown')
})

test('undo and clear are reachable and operable from the keyboard', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1400 }])
  await page.goto('/')
  await supplyCredentials(page)
  await drawRoute(page)

  await page.getByRole('button', { name: /remove last waypoint/i }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('0 km')).toBeVisible()

  await page.getByRole('button', { name: /^clear$/i }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(0)
})

test('a correction control names itself on keyboard focus, not only under a mouse', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1400 }])
  await page.goto('/')
  await supplyCredentials(page)
  await drawRoute(page)

  // In the rail these two are icons, and what says which is which is a tooltip
  // (docs/DESIGN.md). Bound to hover alone it would be a name the keyboard
  // never sees — an undo arrow and a waste basket, and a guess between them.
  const undo = page.getByRole('button', { name: /remove last waypoint/i })
  const label = undo.locator('span')
  await undo.focus()

  await expect
    .poll(() => label.evaluate((element) => getComputedStyle(element).opacity))
    .toBe('1')
})

test('zooming is operable from the keyboard', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [])
  await page.goto('/')
  await supplyCredentials(page)

  const zoomedTo = () =>
    page.evaluate(() => {
      const tile = document.querySelector('.leaflet-tile') as HTMLImageElement | null
      return tile?.src.match(/\/(\d+)\/\d+\/\d+\.png/)?.[1] ?? null
    })
  const before = await zoomedTo()

  await page.getByRole('button', { name: /zoom in/i }).focus()
  await page.keyboard.press('Enter')

  await expect.poll(zoomedTo).not.toBe(before)
})

test('a focused control shows a visible focus ring', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [])
  await page.goto('/')
  await supplyCredentials(page)

  // Zoom in rather than a correction control: those two are disabled until a
  // route exists, and a disabled button takes no focus to draw a ring around.
  const button = page.getByRole('button', { name: /zoom in/i })
  await button.focus()

  const outline = await button.evaluate((element) => {
    const style = getComputedStyle(element)
    return { width: style.outlineWidth, style: style.outlineStyle }
  })

  expect(outline.style).not.toBe('none')
  expect(parseFloat(outline.width)).toBeGreaterThan(0)
})

test('the routing status region is present but shows no empty panel while idle', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [])
  await page.goto('/')
  await supplyCredentials(page)

  // It stays mounted so screen readers observe it from the start (RouteLayer),
  // but with nothing to say it must not paint a stray box over the map.
  const idleStatus = page.locator('div[role="status"]:empty')
  await expect(idleStatus).toHaveCount(1)

  const box = await idleStatus.boundingBox()
  expect(box === null || box.height === 0).toBe(true)
})
