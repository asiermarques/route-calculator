import { MapView } from './shared/map/MapView'
import { ZoomControls } from './shared/map/ZoomControls'
import { AppHeader } from './shared/layout/AppHeader'
import { AppFooter } from './shared/layout/AppFooter'
import { AddressSearchBar } from './address-search/AddressSearchBar'
import { RouteLayer } from './route-drawing/RouteLayer'
import { AddWaypointControl } from './route-drawing/AddWaypointControl'
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

/** Composes the map with every slice that draws or corrects a route. The
 * route state lives here, in `useRoute`, and is passed down as props — the
 * route-drawing and route-correction slices don't import each other.
 *
 * The two bars are the same arrangement: `AppHeader` and `AppFooter` are
 * shells that know where a control goes, and this is the only place that knows
 * which slice each of them comes from. */
function RoutePlanner({ routingProvider, onReopenCredentials }: RoutePlannerProps) {
  const route = useRoute(routingProvider)
  const hasWaypoints = route.waypoints.length > 0

  return (
    <MapView>
      <AppHeader
        search={<AddressSearchBar />}
        readout={<DistanceReadout distanceMeters={route.distanceMeters} />}
        actions={<ReopenCredentialsButton onClick={onReopenCredentials} />}
      />
      <RouteLayer
        waypoints={route.waypoints}
        path={route.path}
        onAddWaypoint={route.addWaypoint}
        onDeleteWaypoint={route.deleteWaypoint}
        onMoveWaypoint={route.moveWaypoint}
      />
      <AppFooter
        add={<AddWaypointControl onAddWaypoint={route.addWaypoint} />}
        corrections={
          <RouteControls
            canUndo={hasWaypoints}
            canClear={hasWaypoints}
            onUndo={route.undo}
            onClear={route.clear}
          />
        }
        status={<RoutingStatus isRouting={route.isRouting} error={route.error} />}
        zoom={<ZoomControls />}
      />
    </MapView>
  )
}

/** Gates the app behind a routing credential (FR-001): the map, address
 * search and drawing surface are not reachable until a provider and key
 * have been supplied, either by the visitor on the credentials screen or by
 * `.env` in development (US-001, US-002). Once configured, the credentials
 * screen is also reachable *from* the app, as a modal over the still-mounted
 * map — reopening it must not discard the drawn route (US-005). */
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
      {routingProvider && (
        <RoutePlanner routingProvider={routingProvider} onReopenCredentials={reopenCredentialsScreen} />
      )}
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
