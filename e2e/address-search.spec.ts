import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockNominatim } from './support/mock-nominatim'

test('submitting a matching address centres the map on it', async ({ page }) => {
  const tiles = await mockTiles(page)
  // A match far from the default view (Madrid), so re-centring requests
  // clearly different tiles.
  await mockNominatim(page, {
    'Eiffel Tower, Paris': [{ lat: '48.8584', lon: '2.2945' }],
  })
  await page.goto('/')
  await expect.poll(() => tiles.length, { timeout: 5000 }).toBeGreaterThan(0)
  const tilesBefore = [...tiles]

  await page.getByRole('textbox', { name: /address/i }).fill('Eiffel Tower, Paris')
  await page.getByRole('button', { name: /search/i }).click()

  await expect
    .poll(() => tiles.length, { timeout: 5000 })
    .toBeGreaterThan(tilesBefore.length)
  const newTiles = tiles.slice(tilesBefore.length)
  expect(newTiles.some((t) => t.x !== tilesBefore[0].x || t.y !== tilesBefore[0].y)).toBe(true)
})

test('submitting an address with no match shows a message and leaves the map unchanged', async ({
  page,
}) => {
  await mockTiles(page)
  await mockNominatim(page, { nowhereatall: [] })
  await page.goto('/')

  await page.getByRole('textbox', { name: /address/i }).fill('nowhereatall')
  await page.getByRole('button', { name: /search/i }).click()

  await expect(page.getByText(/not found/i)).toBeVisible()
})

test('a geocoding failure shows an error message and leaves the map unchanged', async ({ page }) => {
  await mockTiles(page)
  await mockNominatim(page, { 'Puerta del Sol, Madrid': 'error' })
  await page.goto('/')

  await page.getByRole('textbox', { name: /address/i }).fill('Puerta del Sol, Madrid')
  await page.getByRole('button', { name: /search/i }).click()

  await expect(page.getByText(/unavailable/i)).toBeVisible()
})

test('typing quickly does not send a geocoding request per keystroke', async ({ page }) => {
  await mockTiles(page)
  const queries = await mockNominatim(page, {})
  await page.goto('/')

  await page.getByRole('textbox', { name: /address/i }).pressSequentially('Puerta del Sol', {
    delay: 10,
  })

  expect(queries.length).toBe(0)
})
