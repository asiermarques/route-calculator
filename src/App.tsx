import { MapView } from './shared/map/MapView'
import { ZoomControls } from './shared/map/ZoomControls'
import { AppHeader } from './shared/layout/AppHeader'
import { AppFooter } from './shared/layout/AppFooter'
import { AddressSearchBar } from './address-search/AddressSearchBar'
import { RouteLayer } from './route-drawing/RouteLayer'
import { MapHint } from './route-drawing/MapHint'
import { DistanceReadout } from './route-drawing/DistanceReadout'
import { RoutingStatus } from './route-drawing/RoutingStatus'
import { useRoute } from './route-drawing/useRoute'
import { RouteControls } from './route-correction/RouteControls'
import { useCredentials } from './credentials/useCredentials'
import { CredentialsScreen } from './credentials/CredentialsScreen'
import { ReopenCredentialsButton } from './credentials/ReopenCredentialsButton'
import type { RoutingProvider } from './shared/routing/types'

type RoutePlannerProps = {
  routingProvider: RoutingProvider
  onReopenCredentials: () => void
}

/** Everything that draws or corrects a route, rendered *inside* `MapView` by
 * `App` below. The route state lives here, in `useRoute`, and is passed down
 * as props — the route-drawing and route-correction slices don't import each
 * other.
 *
 * The two bars are the same arrangement: `AppHeader` and `AppFooter` are
 * shells that know where a control goes, and this is the only place that knows
 * which slice each of them comes from. The header reports the route, the
 * footer is the toolbar it is acted on from — which is why the way back to the
 * credentials screen is a `settings` slot down there rather than beside the
 * distance (docs/DESIGN.md). */
function RoutePlanner({ routingProvider, onReopenCredentials }: RoutePlannerProps) {
  const route = useRoute(routingProvider)
  const hasWaypoints = route.waypoints.length > 0

  return (
    <>
      <AppHeader
        search={<AddressSearchBar />}
        readout={<DistanceReadout distanceMeters={route.distanceMeters} />}
      />
      <RouteLayer
        waypoints={route.waypoints}
        path={route.path}
        onAddWaypoint={route.addWaypoint}
        onDeleteWaypoint={route.deleteWaypoint}
        onMoveWaypoint={route.moveWaypoint}
      />
      <MapHint routeIsEmpty={!hasWaypoints} />
      <AppFooter
        corrections={
          <RouteControls
            canUndo={hasWaypoints}
            canClear={hasWaypoints}
            onUndo={route.undo}
            onClear={route.clear}
          />
        }
        settings={<ReopenCredentialsButton onClick={onReopenCredentials} />}
        status={<RoutingStatus isRouting={route.isRouting} error={route.error} />}
        zoom={<ZoomControls />}
      />
    </>
  )
}

/** Gates the app behind a routing credential (FR-001): the address search and
 * the drawing surface are not reachable until a provider and key have been
 * supplied, either by the visitor on the credentials screen or by `.env` in
 * development (US-001, US-002). Once configured, the credentials screen is
 * also reachable *from* the app, as a modal over the still-mounted map —
 * reopening it must not discard the drawn route (US-005).
 *
 * The map itself is outside the gate, and is what the credentials screen is
 * shown over from the first load: the screen is a veil over the thing the
 * visitor came for rather than a black rectangle in front of nothing
 * (docs/DESIGN.md). Gated it is `dormant` — drawn, but answering no pointer,
 * key or tab stop — so what FR-001 holds back is still held back. It also
 * means one Leaflet instance for the life of the page: supplying a key adds
 * the controls to a map that is already there and already loaded, instead of
 * swapping it for a second one. */
function App() {
  const {
    routingProvider,
    activeProvider,
    isCredentialsScreenOpen,
    setCredentials,
    reopenCredentialsScreen,
    dismissCredentialsScreen,
  } = useCredentials()

  return (
    <>
      <MapView dormant={isCredentialsScreenOpen}>
        {routingProvider && (
          <RoutePlanner routingProvider={routingProvider} onReopenCredentials={reopenCredentialsScreen} />
        )}
      </MapView>
      {isCredentialsScreenOpen && (
        <CredentialsScreen
          onSubmit={setCredentials}
          initialProvider={activeProvider ?? undefined}
          onDismiss={routingProvider ? dismissCredentialsScreen : undefined}
        />
      )}
    </>
  )
}

export default App
