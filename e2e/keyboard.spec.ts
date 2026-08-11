import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'

/** Drawing a route is a click-on-the-map gesture, which a keyboard cannot
 * perform. These specs cover the way round that: Leaflet's own keyboard pan
 * plus a control that drops a waypoint at the current centre. */

const addWaypoint = /add waypoint at map centre/i

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

test('a route can be drawn end to end without ever using a pointer', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1400 }])
  await page.goto('/')

  const button = page.getByRole('button', { name: addWaypoint })
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(1)

  await panWithKeyboard(page, 'ArrowRight', 'ArrowDown')
  await button.focus()
  await page.keyboard.press('Enter')

  await expect(page.getByText('1.4 km')).toBeVisible()
  await expect(page.locator('path[stroke="var(--color-route)"]')).toHaveCount(1)
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(2)
})

test('each keyboard waypoint lands wherever the map has been panned to', async ({ page }) => {
  await mockTiles(page)
  const requests = await mockRouting(page, [{ distanceMeters: 1400 }])
  await page.goto('/')

  const button = page.getByRole('button', { name: addWaypoint })
  await button.focus()
  await page.keyboard.press('Enter')

  await panWithKeyboard(page, 'ArrowRight', 'ArrowDown')
  await button.focus()
  await page.keyboard.press('Enter')

  await expect(page.getByText('1.4 km')).toBeVisible()
  expect(requests).toHaveLength(1)
  // The control follows the map rather than a position fixed at load, so the
  // pan between the two presses put the waypoints somewhere different.
  expect(requests[0].from).not.toEqual(requests[0].to)
})

test('undo and clear are reachable and operable from the keyboard', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1400 }])
  await page.goto('/')

  const button = page.getByRole('button', { name: addWaypoint })
  await button.focus()
  await page.keyboard.press('Enter')
  await panWithKeyboard(page, 'ArrowRight')
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('1.4 km')).toBeVisible()

  await page.getByRole('button', { name: /^undo$/i }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('0 km')).toBeVisible()

  await page.getByRole('button', { name: /^clear$/i }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(0)
})

test('a focused control shows a visible focus ring', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [])
  await page.goto('/')

  const button = page.getByRole('button', { name: addWaypoint })
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

  // It stays mounted so screen readers observe it from the start (RouteLayer),
  // but with nothing to say it must not paint a stray box over the map.
  const idleStatus = page.locator('div[role="status"]:empty')
  await expect(idleStatus).toHaveCount(1)

  const box = await idleStatus.boundingBox()
  expect(box === null || box.height === 0).toBe(true)
})
