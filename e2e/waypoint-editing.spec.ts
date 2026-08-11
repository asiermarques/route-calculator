import { expect, test } from '@playwright/test'
import { mockTiles } from './support/mock-tiles'
import { mockRouting } from './support/mock-routing'
import { supplyCredentials } from './support/supply-credentials'

async function mapBox(page: import('@playwright/test').Page) {
  const map = page.locator('.leaflet-container')
  return (await map.boundingBox())!
}

function cursorOf(page: import('@playwright/test').Page, selector = '.leaflet-container') {
  return page.evaluate((sel) => getComputedStyle(document.querySelector(sel)!).cursor, selector)
}

test.describe('the cursor says what a click will do (US-001, US-002, US-004)', () => {
  test('the map background shows a crosshair', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [])
    await page.goto('/')
    await supplyCredentials(page)

    expect(await cursorOf(page)).toBe('crosshair')
  })

  test('dragging to pan the map still works with the crosshair shown', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [])
    await page.goto('/')
    await supplyCredentials(page)

    const before = await page.evaluate(() => {
      const pane = document.querySelector('.leaflet-map-pane') as HTMLElement
      return getComputedStyle(pane).transform
    })

    const box = await mapBox(page)
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3, { steps: 5 })
    await page.mouse.up()

    const after = await page.evaluate(() => {
      const pane = document.querySelector('.leaflet-map-pane') as HTMLElement
      return getComputedStyle(pane).transform
    })
    expect(after).not.toBe(before)
  })

  test('overlay controls keep their own cursor rather than the crosshair', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [])
    await page.goto('/')
    await supplyCredentials(page)

    const cursor = await page.evaluate(() => {
      const input = document.querySelector('input[type="search"], input') as HTMLElement
      return getComputedStyle(input).cursor
    })
    expect(cursor).not.toBe('crosshair')
  })

  test('the cursor over a waypoint marker is a pointer, not the crosshair', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)

    expect(await cursorOf(page, 'path.leaflet-interactive')).toBe('pointer')
  })
})

const waypointOptions = (page: import('@playwright/test').Page) =>
  page.getByRole('group', { name: /waypoint options/i })
const deleteButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /^delete$/i })
const moveButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^move$/i })
const waypointMarkers = (page: import('@playwright/test').Page) =>
  page.locator('path[fill="var(--color-waypoint)"]')
const selectedMarker = (page: import('@playwright/test').Page) =>
  page.locator('path[fill="var(--color-waypoint-selected)"]')

test.describe('opening and closing a waypoint\'s options (US-002)', () => {
  test('clicking a waypoint opens options for it, adds nothing, and leaves the distance unchanged', async ({
    page,
  }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }, { distanceMeters: 500 }, { distanceMeters: 400 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
    await expect(page.getByText('1.5 km')).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.6)
    await expect(page.getByText('1.9 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)

    await expect(waypointOptions(page)).toBeVisible()
    await expect(selectedMarker(page)).toHaveCount(1)
    await expect(page.getByText('1.9 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(3) // one is now selected, not "waypoint"-coloured
  })

  test('closes without acting on Escape, leaving the route untouched', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await expect(waypointOptions(page)).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(waypointOptions(page)).not.toBeVisible()
    await expect(page.getByText('1.0 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(2)
  })

  test('closes without acting when the same waypoint is clicked again', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await expect(waypointOptions(page)).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)

    await expect(waypointOptions(page)).not.toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(2)
  })

  test('a click elsewhere on the map closes the options and places a waypoint there, as usual', async ({
    page,
  }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await expect(waypointOptions(page)).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.2)

    await expect(waypointOptions(page)).not.toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(3)
  })
})

test.describe('deleting a waypoint (US-002, US-003)', () => {
  test('deleting the middle of three waypoints re-joins its neighbours with one new segment', async ({
    page,
  }) => {
    await mockTiles(page)
    const requests = await mockRouting(page, [
      { distanceMeters: 1000 },
      { distanceMeters: 500 },
      { distanceMeters: 1400 },
    ])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
    await expect(page.getByText('1.5 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await deleteButton(page).click()

    await expect(page.getByText('1.4 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(2)
    await expect(page.locator('path[stroke="var(--color-route)"]')).toHaveCount(1)
    expect(requests).toHaveLength(3)
  })

  test('deleting the last waypoint issues no routing call and drops the distance to the previous total', async ({
    page,
  }) => {
    await mockTiles(page)
    const requests = await mockRouting(page, [{ distanceMeters: 1000 }, { distanceMeters: 500 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
    await expect(page.getByText('1.5 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
    await deleteButton(page).click()

    await expect(page.getByText('1.0 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(2)
    expect(requests).toHaveLength(2) // no third call for the delete itself
  })

  test('deleting the first waypoint issues no routing call; the second becomes the start', async ({ page }) => {
    await mockTiles(page)
    const requests = await mockRouting(page, [{ distanceMeters: 1000 }, { distanceMeters: 500 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
    await expect(page.getByText('1.5 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await deleteButton(page).click()

    await expect(page.getByText('0.5 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(2)
    expect(requests).toHaveLength(2)
  })

  test('deleting one of exactly two waypoints leaves a single waypoint and 0 km', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await deleteButton(page).click()

    await expect(page.getByText('0 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(1)
    await expect(page.locator('path[stroke="var(--color-route)"]')).toHaveCount(0)
  })

  test('a delete whose replacement segment cannot be routed is reverted whole, with an error shown', async ({
    page,
  }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }, { distanceMeters: 500 }, 'not-found'])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
    await expect(page.getByText('1.5 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await deleteButton(page).click()

    await expect(page.getByText(/could not find a route/i)).toBeVisible()
    await expect(page.getByText('1.5 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(3)
    // Both original segments still drawn — one polyline element carries the
    // whole path (route-drawing.spec.ts's own convention).
    await expect(page.locator('path[stroke="var(--color-route)"]')).toHaveCount(1)
  })
})

test.describe('moving a waypoint (US-004, US-005)', () => {
  test('arming a move and clicking a routable spot relocates the waypoint and re-routes both sides', async ({
    page,
  }) => {
    await mockTiles(page)
    const requests = await mockRouting(page, [
      { distanceMeters: 1000 },
      { distanceMeters: 500 },
      { distanceMeters: 1200 },
      { distanceMeters: 700 },
    ])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
    await expect(page.getByText('1.5 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await moveButton(page).click()
    await expect(waypointOptions(page)).not.toBeVisible()
    await expect(await cursorOf(page)).not.toBe('crosshair')

    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.6)

    await expect(page.getByText('1.9 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(3) // still three waypoints, none appended
    expect(requests).toHaveLength(4)
  })

  test('a click while a move is armed does not append a new waypoint', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }, { distanceMeters: 1200 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await moveButton(page).click()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6)

    await expect(waypointMarkers(page)).toHaveCount(2)
  })

  test('moving the last waypoint re-routes only its incoming segment', async ({ page }) => {
    await mockTiles(page)
    const requests = await mockRouting(page, [{ distanceMeters: 1000 }, { distanceMeters: 1200 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await moveButton(page).click()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6)

    await expect(page.getByText('1.2 km')).toBeVisible()
    expect(requests).toHaveLength(2)
  })

  test('an armed move to an unroutable spot is reverted, with an error, leaving the waypoint where it was', async ({
    page,
  }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }, 'not-found'])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await moveButton(page).click()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6)

    await expect(page.getByText(/could not find a route/i)).toBeVisible()
    await expect(page.getByText('1.0 km')).toBeVisible()
    await expect(waypointMarkers(page)).toHaveCount(2)
  })

  test('Escape cancels an armed move: the route is untouched and the next click appends as usual', async ({
    page,
  }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await moveButton(page).click()
    await page.keyboard.press('Escape')
    await expect(await cursorOf(page)).toBe('crosshair')

    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6)

    await expect(waypointMarkers(page)).toHaveCount(3)
  })

  test('clicking the armed waypoint again cancels the move, leaving the route untouched', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await moveButton(page).click()
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)

    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6)
    await expect(waypointMarkers(page)).toHaveCount(3) // the click appended, it didn't move anything
  })

  test('clearing the route while a move is armed drops the armed state', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await moveButton(page).click()
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByText('0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)
    await expect(waypointMarkers(page)).toHaveCount(1)
  })

  test('undoing the armed waypoint drops the armed state', async ({ page }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 1000 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await expect(page.getByText('1.0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await moveButton(page).click()
    await page.getByRole('button', { name: /remove last waypoint/i }).click()
    await expect(page.getByText('0 km')).toBeVisible()

    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6)
    await expect(waypointMarkers(page)).toHaveCount(2)
  })
})

test.describe('overlapping waypoints resolve to exactly one (EDGE-002)', () => {
  test('clicking one of two waypoints placed at the same spot opens options for exactly one, marked', async ({
    page,
  }) => {
    await mockTiles(page)
    await mockRouting(page, [{ distanceMeters: 0 }])
    await page.goto('/')
    await supplyCredentials(page)

    const box = await mapBox(page)
    const x = box.x + box.width * 0.5
    const y = box.y + box.height * 0.5
    await page.mouse.click(x, y)
    // A few pixels off — outside the first marker's own hit radius (so this
    // still places a second waypoint rather than opening the first one's
    // options) but inside its drawn diameter, so the two render overlapping.
    // Both bounds come from `WAYPOINT_RADIUS_FINE` in `RouteLayer.tsx`: a
    // mouse-sized waypoint is hit-tested out to its radius plus half its
    // stroke, and two of them overlap while they are less than a diameter
    // apart. This offset has to move if that radius does.
    await page.mouse.click(x + 11, y)
    await expect(waypointMarkers(page)).toHaveCount(2)

    await page.mouse.click(x, y)

    await expect(waypointOptions(page)).toBeVisible()
    await expect(selectedMarker(page)).toHaveCount(1)
  })
})
