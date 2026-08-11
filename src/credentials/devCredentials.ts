import { createRoutingProvider, RoutingConfigError } from '../shared/routing/config'
import type { RoutingProvider } from '../shared/routing/types'

/** Seeds routing credentials from build-time configuration in development
 * only (US-002), so `npm run dev` keeps working from `.env` with no
 * credentials screen in the way.
 *
 * `import.meta.env.DEV` is a compile-time constant Vite inlines to `false`
 * in a production build; esbuild's minifier then removes this whole branch,
 * so `VITE_ROUTING_API_KEY` is not merely unset in that build, it is not
 * present in the emitted code at all (BR-002). A production `.env` setting
 * these variables therefore has no effect — see the build-output assertion
 * in `noKeyInBundle.build.test.ts`. */
export function devRoutingProvider(): RoutingProvider | null {
  if (!import.meta.env.DEV) return null

  try {
    return createRoutingProvider({
      VITE_ROUTING_PROVIDER: import.meta.env.VITE_ROUTING_PROVIDER,
      VITE_ROUTING_API_KEY: import.meta.env.VITE_ROUTING_API_KEY,
    })
  } catch (error) {
    if (error instanceof RoutingConfigError) return null
    throw error
  }
}
