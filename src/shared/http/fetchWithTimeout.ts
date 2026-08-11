/** How long any third-party call may take before it is abandoned. Long enough
 * for a slow mobile connection, short enough that the user gets an answer. */
export const REQUEST_TIMEOUT_MS = 10_000

/** Rejection reason when a request is abandoned for taking too long. Carries no
 * URL and no credential, so it stays safe to log or surface (BR-001). */
export class RequestTimeoutError extends Error {
  constructor(timeoutMs: number = REQUEST_TIMEOUT_MS) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'RequestTimeoutError'
  }
}

/** `fetch` that gives up instead of hanging forever. Every call to Nominatim
 * and to a routing provider goes through here: a connection that is accepted
 * and then never answered would otherwise leave the caller waiting with no way
 * back — and, for routing, wedge the queue in `useRoute` behind a promise that
 * never settles. Third-party availability is a normal operating condition
 * (ARCHITECTURE.md), so a request that stalls has to fail like any other. */
export async function fetchWithTimeout(input: URL | string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new RequestTimeoutError()),
    REQUEST_TIMEOUT_MS,
  )

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
