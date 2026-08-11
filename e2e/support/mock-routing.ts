import type { Page } from '@playwright/test'

/** One segment's canned response: a distance in meters for a successful
 * route, or a failure mode. Requests are matched to responses in the order
 * they're made. */
export type RouteResponse = { distanceMeters: number } | 'error' | 'not-found'

export type RouteRequest = { from: [number, number]; to: [number, number] }

/** Stubs the OpenRouteService directions endpoint (the provider this app's
 * e2e build is configured with) and records every request made, in order,
 * so specs stay offline and deterministic. Responses are consumed in the
 * order given; the last one repeats for any further requests. */
export async function mockRouting(page: Page, responses: RouteResponse[]): Promise<RouteRequest[]> {
  const requests: RouteRequest[] = []
  let callIndex = 0

  await page.route('https://api.openrouteservice.org/v2/directions/**', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as { coordinates: [number, number][] }
    const [from, to] = body.coordinates
    requests.push({ from, to })

    const response = responses[Math.min(callIndex, responses.length - 1)]
    callIndex++

    if (response === 'error') {
      await route.fulfill({ status: 503, body: '' })
      return
    }
    if (response === 'not-found') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Could not find routable point' } }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            geometry: { coordinates: [from, to] },
            properties: { summary: { distance: response.distanceMeters } },
          },
        ],
      }),
    })
  })

  return requests
}
