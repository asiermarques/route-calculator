const NO_REJECTION = Symbol('no rejection')

/** The error a promise rejected with, for assertions about the error itself
 * rather than merely that one was thrown — checking, for instance, that a
 * message carries no API key. Attaches its handlers synchronously, so it is
 * safe to call before advancing fake timers. */
export async function rejectionOf(promise: Promise<unknown>): Promise<Error> {
  const outcome = await promise.then(
    () => NO_REJECTION,
    (reason: unknown) => reason,
  )

  if (outcome === NO_REJECTION) {
    throw new Error('Expected the promise to reject, but it resolved.')
  }

  return outcome as Error
}
