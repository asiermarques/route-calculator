import { afterEach, describe, expect, it, vi } from 'vitest'
import { REQUEST_TIMEOUT_MS, RequestTimeoutError, fetchWithTimeout } from './fetchWithTimeout'
import { rejectionOf } from '../../test/rejectionOf'

/** A server that accepts the connection and then never answers — the case a
 * plain `fetch` would wait on indefinitely. */
function stubNeverAnsweringFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_input: unknown, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        }),
    ),
  )
}

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('resolves with the response when the request answers in time', async () => {
    const response = new Response('{}', { status: 200 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(fetchWithTimeout('https://example.test/')).resolves.toBe(response)
  })

  it('passes the caller request options through, adding an abort signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchWithTimeout('https://example.test/', {
      method: 'POST',
      headers: { Authorization: 'a-key' },
      body: '{"a":1}',
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ Authorization: 'a-key' })
    expect(init.body).toBe('{"a":1}')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('gives up on a request that never answers, instead of hanging forever', async () => {
    vi.useFakeTimers()
    stubNeverAnsweringFetch()

    const rejection = rejectionOf(fetchWithTimeout('https://example.test/'))
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)

    await expect(rejection).resolves.toBeInstanceOf(RequestTimeoutError)
  })

  it('reports a timeout without leaking the URL or any credential in it', async () => {
    vi.useFakeTimers()
    stubNeverAnsweringFetch()

    const rejection = rejectionOf(fetchWithTimeout('https://example.test/route?access_token=secret-key'))
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)

    const error = await rejection
    expect(error.message).not.toContain('secret-key')
    expect(error.message).not.toContain('example.test')
  })

  it('stops the timer once the request has answered, so a later tick aborts nothing', async () => {
    vi.useFakeTimers()
    const abortSpy = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: unknown, init: RequestInit) => {
        init.signal?.addEventListener('abort', abortSpy)
        return new Response('{}', { status: 200 })
      }),
    )

    await fetchWithTimeout('https://example.test/')
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 2)

    expect(abortSpy).not.toHaveBeenCalled()
  })
})
