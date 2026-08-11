import type { Page } from '@playwright/test'

type NominatimMatch = { lat: string; lon: string }

/** Stubs Nominatim search responses per query, and records every request
 * made, so specs stay offline and deterministic and can assert on debounce
 * behaviour. */
export async function mockNominatim(
  page: Page,
  responses: Record<string, NominatimMatch[] | 'error'>,
): Promise<string[]> {
  const queries: string[] = []

  await page.route('https://nominatim.openstreetmap.org/search**', async (route) => {
    const url = new URL(route.request().url())
    const q = url.searchParams.get('q') ?? ''
    queries.push(q)

    const response = responses[q]
    if (response === 'error') {
      await route.fulfill({ status: 503, body: '' })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response ?? []),
    })
  })

  return queries
}
