import type { Page } from '@playwright/test'

export type Provider = 'mapbox' | 'openrouteservice'

/** Fills and submits the credentials screen (US-001), so specs reach the map
 * the way a real visitor would rather than skip past a screen production
 * builds now show on every load. Every mocked routing origin in this suite
 * is OpenRouteService's (`mock-routing.ts`), so that's the default provider
 * — the key value itself is never checked by the mocks. Call this after
 * every `page.goto('/')` and after any `page.reload()`, since credentials
 * live in memory only and don't survive either (BR-001). */
export async function supplyCredentials(
  page: Page,
  provider: Provider = 'openrouteservice',
  apiKey = 'e2e-test-key',
): Promise<void> {
  await page.getByRole('combobox', { name: /routing provider/i }).selectOption(provider)
  const keyField = page.getByLabel(/api key/i)
  await keyField.fill(apiKey)
  // Submits via the keyboard rather than clicking the button: leaving a
  // mouse click as this helper's last interaction has been observed to
  // suppress Chromium's `:focus-visible` on the next *programmatically*
  // focused element (e2e/keyboard.spec.ts's focus-ring assertion), even
  // though that element belongs to an unrelated, freshly rendered screen.
  await keyField.press('Enter')
}
