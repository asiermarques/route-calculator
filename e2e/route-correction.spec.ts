import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

async function mapBox(page: import('@playwright/test').Page) {
  const map = page.locator('.leaflet-container')
  return (await map.boundingBox())!
}

test('undo and clear are inert on an empty route', async ({ page }) => {
  await mockTiles(page)
  await page.goto('/')
  await supplyCredentials(page)

  await expect(page.getByRole('button', { name: /remove last waypoint/i })).toBeDisabled()
  await expect(page.getByRole('button', { name: /clear/i })).toBeDisabled()
})

test('undo removes the last waypoint and its incoming segment, dropping the distance to the previous total', async ({
  page,
}) => {
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

  await page.getByRole('button', { name: /remove last waypoint/i }).click()

  await expect(page.getByText('1.0 km')).toBeVisible()
})

test('repeated undo walks the route back to empty, disabling the control', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(page.getByText('1.0 km')).toBeVisible()

  await page.getByRole('button', { name: /remove last waypoint/i }).click()
  await expect(page.getByText('0 km')).toBeVisible()
  await expect(page.getByRole('button', { name: /remove last waypoint/i })).toBeEnabled()

  await page.getByRole('button', { name: /remove last waypoint/i }).click()
  await expect(page.getByText('0 km')).toBeVisible()
  await expect(page.getByRole('button', { name: /remove last waypoint/i })).toBeDisabled()
})

test('clear empties the whole route in one action and resets the distance', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }, { distanceMeters: 500 }])
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
  await expect(page.getByText('1.5 km')).toBeVisible()

  await page.getByRole('button', { name: /clear/i }).click()

  await expect(page.getByText('0 km')).toBeVisible()
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(0)
  await expect(page.locator('path[stroke="var(--color-route)"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /clear/i })).toBeDisabled()
})

test('a new route can be started right after clearing', async ({ page }) => {
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(page.getByText('1.0 km')).toBeVisible()
  await page.getByRole('button', { name: /clear/i }).click()
  await expect(page.getByText('0 km')).toBeVisible()

  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)

  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(1)
})

test('clearing the route leaves the map centred and zoomed where it was', async ({ page }) => {
  const tiles = await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)
  await expect.poll(() => tiles.length, { timeout: 5000 }).toBeGreaterThan(0)

  await page.getByRole('button', { name: /zoom in/i }).click()
  await expect.poll(() => tiles.some((t) => t.z === 14), { timeout: 5000 }).toBe(true)
  await page.waitForTimeout(300)

  const box = await mapBox(page)
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(page.getByText('1.0 km')).toBeVisible()

  const tilesBeforeClear = [...tiles]
  await page.getByRole('button', { name: /clear/i }).click()
  await expect(page.getByText('0 km')).toBeVisible()

  // No new tile requests at a different zoom means the view didn't move.
  await page.waitForTimeout(300)
  const newTiles = tiles.slice(tilesBeforeClear.length)
  expect(newTiles.every((t) => t.z === 14)).toBe(true)
})
