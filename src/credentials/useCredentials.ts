import { useMemo, useState } from 'react'
import { createRoutingProvider } from '../shared/routing/config'
import type { ProviderName } from '../shared/routing/config'
import type { RoutingProvider } from '../shared/routing/types'
import { devRoutingProvider } from './devCredentials'

type ManualCredentials = { provider: ProviderName; apiKey: string }

export type UseCredentialsResult = {
  /** `null` until a routing provider is available — either supplied
   * manually or seeded from `.env` in development (US-002). The app shows
   * the credentials screen while this is `null` (FR-001). */
  routingProvider: RoutingProvider | null
  /** The provider name behind `routingProvider`, when it was supplied
   * manually — `null` before any manual submission (e.g. a development
   * seed). Used to preselect the visitor's own provider when they reopen
   * the screen to correct a mistake (US-005). */
  activeProvider: ProviderName | null
  /** Whether the credentials screen should be shown: true before any
   * credentials exist (FR-001), or when the visitor has reopened it to
   * change provider or key (US-005). */
  isCredentialsScreenOpen: boolean
  /** Makes `provider`/`apiKey` the ones used for subsequent routing
   * (US-001) and closes the screen if it was open. Held in React state
   * only — never written to any browser store — so it is gone after a
   * reload (BR-001). */
  setCredentials: (provider: ProviderName, apiKey: string) => void
  /** Reopens the credentials screen without discarding the routing
   * provider currently in use, so the drawn route survives (US-005). */
  reopenCredentialsScreen: () => void
  /** Closes a reopened screen without changing anything — the credentials
   * already in use stay in use (US-005). */
  dismissCredentialsScreen: () => void
}

/** Owns the routing credential for the lifetime of the page. Manually
 * supplied credentials take priority; otherwise development seeds from
 * build-time configuration (`devRoutingProvider`, US-002). */
export function useCredentials(): UseCredentialsResult {
  const [manual, setManual] = useState<ManualCredentials | null>(null)
  // Read once: build-time configuration doesn't change while the page runs.
  const [devProvider] = useState(devRoutingProvider)
  const [isReopened, setIsReopened] = useState(false)

  const routingProvider = useMemo(() => {
    if (!manual) return devProvider
    return createRoutingProvider({
      VITE_ROUTING_PROVIDER: manual.provider,
      VITE_ROUTING_API_KEY: manual.apiKey,
    })
  }, [manual, devProvider])

  function setCredentials(provider: ProviderName, apiKey: string) {
    setManual({ provider, apiKey })
    setIsReopened(false)
  }

  function reopenCredentialsScreen() {
    setIsReopened(true)
  }

  function dismissCredentialsScreen() {
    setIsReopened(false)
  }

  return {
    routingProvider,
    activeProvider: manual?.provider ?? null,
    isCredentialsScreenOpen: routingProvider === null || isReopened,
    setCredentials,
    reopenCredentialsScreen,
    dismissCredentialsScreen,
  }
}
