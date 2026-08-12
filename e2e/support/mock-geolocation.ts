import type { Page } from '@playwright/test'

/** Grants location permission and fixes Chromium's own geolocation emulation
 * to a point, so a successful reading is deterministic and offline
 * (`CLAUDE.md`, "Testing") — the browser answers `getCurrentPosition` from
 * this, with no real device or network call involved. */
export async function grantGeolocation(
  page: Page,
  coords: { latitude: number; longitude: number },
): Promise<void> {
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation(coords)
}

/** Leaves geolocation permission ungranted — which is how Playwright's own
 * browsers answer `getCurrentPosition`: a `PERMISSION_DENIED` error, with no
 * real OS prompt for a spec to interact with (FR-005, EDGE-001). */
export async function denyGeolocation(page: Page): Promise<void> {
  await page.context().clearPermissions()
}

/** Stubs `navigator.geolocation` before any of the app's own scripts run, for
 * failures Chromium's own permission/geolocation emulation can't produce: no
 * position available at all, or a reading that never calls back (so it is the
 * app's own bounded wait that ends the attempt, not the browser) — offline and
 * deterministic either way (`CLAUDE.md`, "Testing"). */
export async function stubGeolocationError(page: Page, code: number): Promise<void> {
  await page.addInitScript((errorCode) => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback | null,
        ) => {
          error?.({ code: errorCode, message: 'stubbed for e2e' } as GeolocationPositionError)
        },
      },
    })
  }, code)
}

/** A reading that never calls back at all — the case the app's own bounded
 * wait (US-002), not the browser, has to end. */
export async function stubGeolocationHang(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: () => {} },
    })
  })
}

/** Resolves the very first call — the automatic attempt the control now makes
 * on its own the moment it appears — immediately and invisibly, then hangs on
 * every call after that. Lets a spec about a *press* start from a control
 * that is already idle and enabled, instead of waiting out (or colliding
 * with) the automatic attempt every load now also makes. */
export async function stubGeolocationAutoSucceedsThenHangs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let calls = 0
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          calls++
          if (calls === 1) {
            success({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition)
          }
          // every later call just hangs, so a manual press stays observable
          // in flight.
        },
      },
    })
  })
}

/** Removes the Geolocation API entirely, the way an old browser or a
 * non-secure context would (US-004) — decided at load, before the app ever
 * checks for it. */
export async function removeGeolocationApi(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })
  })
}
