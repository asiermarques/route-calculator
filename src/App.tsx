import { MapView } from './shared/map/MapView'
import { AddressSearchBar } from './address-search/AddressSearchBar'
import { RouteLayer } from './route-drawing/RouteLayer'
import { AddWaypointControl } from './route-drawing/AddWaypointControl'
import { DistanceReadout } from './route-drawing/DistanceReadout'
import { useRoute } from './route-drawing/useRoute'
import { RouteControls } from './route-correction/RouteControls'
import { createRoutingProvider } from './shared/routing/config'
import type { RoutingProvider } from './shared/routing/types'
import styles from './App.module.css'

type RoutePlannerProps = {
  routingProvider: RoutingProvider
}

/** Composes the map with every slice that draws or corrects a route. The
 * route state lives here, in `useRoute`, and is passed down as props — the
 * route-drawing and route-correction slices don't import each other. */
function RoutePlanner({ routingProvider }: RoutePlannerProps) {
  const route = useRoute(routingProvider)
  const hasWaypoints = route.waypoints.length > 0

  return (
    <MapView>
      <AddressSearchBar />
      <RouteLayer
        waypoints={route.waypoints}
        path={route.path}
        isRouting={route.isRouting}
        error={route.error}
        onAddWaypoint={route.addWaypoint}
      />
      <AddWaypointControl onAddWaypoint={route.addWaypoint} />
      <DistanceReadout distanceMeters={route.distanceMeters} />
      <RouteControls
        canUndo={hasWaypoints}
        canClear={hasWaypoints}
        onUndo={route.undo}
        onClear={route.clear}
      />
    </MapView>
  )
}

/** Routing configuration is validated once at startup (US-005): an unknown
 * provider or a missing API key fails clearly here, rather than surfacing as
 * a confusing error on the user's first click. */
function App() {
  try {
    const routingProvider = createRoutingProvider(import.meta.env)
    return <RoutePlanner routingProvider={routingProvider} />
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The app is misconfigured.'
    return (
      <div className={styles.configError}>
        <p className={styles.configErrorMessage}>{message}</p>
      </div>
    )
  }
}

export default App
