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

/** Both bars arrive with a 460ms entrance that moves them in from their own
 * edge, and a box read while that is still running has not landed yet — two
 * reads taken a few frames apart disagree by however far the transform moved
 * between them, which is a flake in any test that compares one box to another.
 * Waits for the element's own animations only: the routing status pulse never
 * finishes, and a subtree wait would never return. Under
 * `prefers-reduced-motion` there is nothing to wait for and this resolves at
 * once. */
async function landed(page: Page, selector: 'header' | 'footer') {
  await page
    .locator(selector)
    .evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    )
}

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

test('on a wide screen the footer is a rail down the left, not a bar across the bottom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  await landed(page, 'footer')
  const clear = (await page.getByRole('button', { name: /^clear$/i }).boundingBox())!
  const zoomOut = (await page.getByRole('button', { name: /zoom out/i }).boundingBox())!

  // The two panels are stacked, not spread across the bottom: zoom sits below
  // the tools, in the same narrow column, close to the left edge.
  expect(zoomOut.y, 'zoom is not below the tools').toBeGreaterThan(clear.y + clear.height)
  expect(Math.abs(zoomOut.x - clear.x), 'the panels are not in one column').toBeLessThan(4)
  expect(clear.x + clear.width, 'the rail is wider than a column of controls').toBeLessThan(100)

  // Which is the entire point: the bottom of the map comes back, as map in
  // both senses — it is drawn there, and a click there reaches it. A control
  // occupies a column at one edge instead of a band across the whole width.
  const bottom = { x: 640, y: 800 - 60 }
  expect(await coveringTheMapAt(page, bottom.x, bottom.y)).toBe('the map')
  await page.mouse.click(bottom.x, bottom.y)
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(1)

  // And the rail's own column is only the panels: the frame they are placed in
  // runs the height of the map, and an invisible strip that answers clicks is
  // the same lost map with none of the honesty.
  expect(await coveringTheMapAt(page, clear.x + clear.width / 2, 200)).toBe('the map')
})

test('on a wide screen the header is two panels in the corner, not a band across the top', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  await landed(page, 'header')
  await landed(page, 'footer')
  const header = (await page.locator('header').boundingBox())!
  expect(header.width, 'the header still spans the screen').toBeLessThan(400)
  expect(header.x + header.width, 'the card is not against the right edge').toBeGreaterThan(1280 - 40)

  // Two panels, not one box with a rule in it: the search above, the answer
  // below, and map showing between them. The `<header>` here is only the frame
  // they are stacked in, which is why it must catch nothing — a gap that looks
  // like map and behaves like an overlay is the worst of both.
  const panels = page.locator('header > div')
  await expect(panels).toHaveCount(2)
  const find = (await panels.first().boundingBox())!
  const readout = (await panels.last().boundingBox())!
  expect(readout.y, 'the answer is not below the search').toBeGreaterThan(find.y + find.height)
  const between = { x: find.x + find.width / 2, y: (find.y + find.height + readout.y) / 2 }
  expect(
    await coveringTheMapAt(page, between.x, between.y),
    'the two panels are one box after all',
  ).toBe('the map')

  // The point of moving it: the band it used to draw cut the map in two, and
  // what it left above itself was a 100px strip no route fits in. The top of
  // the map is map again — drawn there, and reachable by a click there.
  const top = { x: 400, y: 40 }
  expect(await coveringTheMapAt(page, top.x, top.y)).toBe('the map')
  await page.mouse.click(top.x, top.y)
  await expect(page.locator('path[fill="var(--color-waypoint)"]')).toHaveCount(1)

  // And it faces the rail across the map rather than sitting on the same side:
  // what the route is acted on with at one edge, what is read off it at the
  // other.
  const clear = (await page.getByRole('button', { name: /^clear$/i }).boundingBox())!
  expect(header.x, 'the card and the rail are on the same side').toBeGreaterThan(clear.x + 400)
})

test('a correction is named by a tooltip in both arrangements, and it lands on map', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, ['error'])

  for (const viewport of [
    { name: 'the bar', width: 768, height: 1024, avoidsTheStatus: false },
    { name: 'the rail', width: 1280, height: 800, avoidsTheStatus: true },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await supplyCredentials(page)

    // The widest state either arrangement has: a routing error, which is prose,
    // on screen at the same time as every control.
    const map = (await page.locator('.leaflet-container').boundingBox())!
    await page.mouse.click(map.x + map.width * 0.4, map.y + map.height * 0.4)
    await page.mouse.click(map.x + map.width * 0.6, map.y + map.height * 0.5)
    await expect(page.getByText(/could not find a route/i)).toBeVisible()

    const undo = page.getByRole('button', { name: /remove last waypoint/i })
    const label = undo.locator('span')
    const opacity = () => label.evaluate((element) => getComputedStyle(element).opacity)

    // The face is the icon in both arrangements, so the label is a tooltip in
    // both — and it is the button's accessible name, so it is hidden with
    // opacity and never taken out of the tree.
    expect(await opacity(), `the label is on the face of the button in ${viewport.name}`).toBe('0')
    await undo.hover()
    await expect.poll(opacity, { message: `hovering the control does not name it` }).toBe('1')

    const tooltip = (await label.boundingBox())!
    for (const [name, locator] of [
      ['clear', page.getByRole('button', { name: /^clear$/i })],
      ['change routing provider', page.getByRole('button', { name: /change routing provider/i })],
      ['zoom in', page.getByRole('button', { name: /zoom in/i })],
      ['zoom out', page.getByRole('button', { name: /zoom out/i })],
    ] as const) {
      const box = (await locator.boundingBox())!
      expect(overlaps(tooltip, box), `the tooltip covers ${name} in ${viewport.name}`).toBe(false)
    }

    // In the rail it must also clear the routing error, which hangs off the same
    // side the tooltips open on — a message with a tooltip landing on it every
    // time the visitor reaches for undo. In the bar the tooltip opens upward,
    // where the status is, and wins that overlap on purpose (docs/DESIGN.md):
    // the status is a live region rather than a control, and the tooltip is
    // there only while the pointer is.
    const status = (await page
      .getByRole('status')
      .filter({ hasText: /could not find/i })
      .boundingBox())!
    if (viewport.avoidsTheStatus) {
      expect(overlaps(tooltip, status), 'the tooltip covers the routing error').toBe(false)
    }
  }
})

test('the gear names itself on hover, in both arrangements, without covering a control', async ({
  page,
}) => {
  await mockTiles(page)
  await mockRouting(page, ['error'])

  for (const viewport of [
    { name: 'the bar', width: 768, height: 1024 },
    { name: 'the rail', width: 1280, height: 800 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    await supplyCredentials(page)

    // The widest state either arrangement has: a routing error on screen at the
    // same time as every control.
    const map = (await page.locator('.leaflet-container').boundingBox())!
    await page.mouse.click(map.x + map.width * 0.4, map.y + map.height * 0.4)
    await page.mouse.click(map.x + map.width * 0.6, map.y + map.height * 0.5)
    await expect(page.getByText(/could not find a route/i)).toBeVisible()

    const gear = page.getByRole('button', { name: /change routing provider/i })
    const label = gear.locator('span')
    const opacity = () => label.evaluate((element) => getComputedStyle(element).opacity)

    // Icon-only in both arrangements, so its name is a tooltip in both — and
    // hidden with opacity, never removed, because it is the accessible name.
    expect(await opacity(), `the gear is already labelled in ${viewport.name}`).toBe('0')
    await gear.hover()
    await expect.poll(opacity, { message: `hovering the gear does not name it` }).toBe('1')

    // Wherever it opens, it opens over map: a tooltip drawn over a control is a
    // control that cannot be pressed.
    const tooltip = (await label.boundingBox())!
    for (const [name, locator] of [
      ['clear', page.getByRole('button', { name: /^clear$/i })],
      ['undo', page.getByRole('button', { name: /remove last waypoint/i })],
      ['zoom in', page.getByRole('button', { name: /zoom in/i })],
      ['zoom out', page.getByRole('button', { name: /zoom out/i })],
    ] as const) {
      const box = (await locator.boundingBox())!
      expect(overlaps(tooltip, box), `the gear's tooltip covers ${name} in ${viewport.name}`).toBe(
        false,
      )
    }
  }
})

test('on a phone the header stays a single panel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await mockTiles(page)
  await mockRouting(page, [{ distanceMeters: 1000 }])
  await page.goto('/')
  await supplyCredentials(page)

  // Two panels and a gap is the same wide-screen luxury the footer's rail is:
  // at 375px the split costs a second border, a second padding and a second
  // shadow out of the screen with the least height to spend. So the `<header>`
  // is still the panel here, not the frame two panels are stacked in — which is
  // a thing this can ask directly, since a frame draws no background.
  const background = await page
    .locator('header')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(background, 'the header is a frame rather than a panel on a phone').not.toBe(
    'rgba(0, 0, 0, 0)',
  )
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
  for (const name of [/remove last waypoint/i, /^clear$/i, /zoom in/i, /zoom out/i]) {
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
      ['locate', page.getByRole('button', { name: /locate/i })],
      ['distance', page.getByRole('status').filter({ hasText: /km/ })],
      ['routing status', page.getByRole('status').filter({ hasText: /could not find/i })],
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
