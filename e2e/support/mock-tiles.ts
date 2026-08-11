import type { Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TILE_FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/tile.png',
)

/** Tile z/x/y parsed from a requested OpenStreetMap tile URL. */
export type TileRequest = { z: number; x: number; y: number }

/** Stubs OpenStreetMap tile requests with a fixture image and records every
 * tile coordinate requested, so specs stay offline and deterministic. */
export async function mockTiles(page: Page): Promise<TileRequest[]> {
  const requests: TileRequest[] = []

  await page.route('https://*.tile.openstreetmap.org/**', async (route) => {
    const match = route.request().url().match(/\/(\d+)\/(\d+)\/(\d+)\.png/)
    if (match) {
      requests.push({ z: Number(match[1]), x: Number(match[2]), y: Number(match[3]) })
    }
    await route.fulfill({ path: TILE_FIXTURE, contentType: 'image/png' })
  })

  return requests
}
