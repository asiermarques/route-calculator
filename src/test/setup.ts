import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// jsdom has no `matchMedia` at all, and code that asks it a question about the
// device — `useCoarsePointer`, which sizes waypoint markers for a finger or a
// cursor — would otherwise throw rather than answer. Every query reports "does
// not match", so unit tests see the mouse-sized defaults; a test that cares
// about the other answer overrides this for itself. Guarded because this setup
// file also runs for the suites that opt into a plain Node environment, which
// has no `window` to patch and no component to need one.
if (typeof window !== 'undefined') {
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

afterEach(() => {
  cleanup()
})
