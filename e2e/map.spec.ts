import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'

const DEFAULT_ZOOM = 13

test('the map fills the viewport with OpenStreetMap attribution on load', async ({ page }) => {
  await mockTiles(page)
  await page.goto('/')

  const map = page.locator('.leaflet-container')
  await expect(map).toBeVisible()

  const viewport = page.viewportSize()!
  const box = await map.boundingBox()
  expect(box?.width).toBeCloseTo(viewport.width, 0)
  expect(box?.height).toBeCloseTo(viewport.height, 0)

  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap')
})

test('dragging and zooming pans the view and loads new tiles', async ({ page }) => {
  const requests = await mockTiles(page)
  await page.goto('/')
  await expect.poll(() => requests.length, { timeout: 5000 }).toBeGreaterThan(0)
  const initialTiles = [...requests]

  const map = page.locator('.leaflet-container')
  const box = (await map.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2 + 150, { steps: 10 })
  await page.mouse.up()

  await page.click('.leaflet-control-zoom-in')
  await expect
    .poll(() => requests.length, { timeout: 5000 })
    .toBeGreaterThan(initialTiles.length)

  const newTiles = requests.slice(initialTiles.length)
  expect(newTiles.some((t) => t.z !== initialTiles[0].z || t.x !== initialTiles[0].x)).toBe(true)
})

test('reloading after panning returns to the default centre and zoom', async ({ page }) => {
  const requests = await mockTiles(page)
  await page.goto('/')
  await expect.poll(() => requests.length, { timeout: 5000 }).toBeGreaterThan(0)

  await page.click('.leaflet-control-zoom-in')
  await expect
    .poll(() => requests.some((t) => t.z === DEFAULT_ZOOM + 1), { timeout: 5000 })
    .toBe(true)
  await page.waitForTimeout(300) // let the zoom animation finish before the next click
  await page.click('.leaflet-control-zoom-in')
  await expect
    .poll(() => requests.some((t) => t.z === DEFAULT_ZOOM + 2), { timeout: 5000 })
    .toBe(true)

  requests.length = 0
  await page.reload()
  await expect
    .poll(() => requests.length, { timeout: 5000 })
    .toBeGreaterThan(0)

  expect(requests.every((t) => t.z === DEFAULT_ZOOM)).toBe(true)
})
