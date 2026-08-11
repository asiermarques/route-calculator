import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { DomEvent } from 'leaflet'
import type { LeafletMouseEvent, Polyline as LeafletPolyline } from 'leaflet'
import type { Waypoint } from './useRoute'
import type { LatLng } from '../shared/routing/types'
import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import { WaypointOptionsPanel } from './WaypointOptionsPanel'
import { panelPlacement } from './panelPlacement'
import { useCoarsePointer } from './useCoarsePointer'
import styles from './RouteLayer.module.css'

type RouteLayerProps = {
  waypoints: Waypoint[]
  path: LatLng[]
  isRouting: boolean
  error: string | null
  onAddWaypoint: (point: LatLng) => void
  onDeleteWaypoint: (id: string) => void
  onMoveWaypoint: (id: string, point: LatLng) => void
}

/** Which waypoint's options are open, and which waypoint's move is armed —
 * at most one of each (FR-004), tracked together since choosing "Move" moves
 * a waypoint from one to the other. */
type EditState = { selected: string | null; armed: string | null }
const NO_EDIT: EditState = { selected: null, armed: null }

/** Marker radius in pixels, by how precisely the visitor can point. A finger
 * covers far more of the screen than a cursor hotspot does, and a Leaflet
 * vector marker is hit-tested against exactly the shape it draws — so at the
 * fine-pointer size a waypoint is a 12px target, which on a phone is most of
 * the way to unhittable. The touch size is the dot itself, not an invisible
 * halo around it: a bigger dot is also easier to *see* on a small screen, and
 * a marker whose hit area is larger than it looks would swallow taps meant
 * for the map next to it. */
const WAYPOINT_RADIUS_FINE = 6
const WAYPOINT_RADIUS_COARSE = 11
// The drawn route answers no clicks of its own — a tap on it means the same
// thing as a tap on the map underneath. Saying so explicitly matters on touch:
// as an interactive layer the line is a large tap target lying directly under
// every waypoint, and a tap meant for a marker gets resolved to the line
// instead, which then bubbles to the map and appends a waypoint rather than
// opening the options for the one that was aimed at. A mouse never sees this
// — its hit test is a single point, and the marker is painted above the line
// — so the failure is touch-only. `bringToBack()` below fixes the paint order
// but not this, since the line stays hit-testable wherever it is drawn.
const PATH_OPTIONS = { color: 'var(--color-route)', weight: 4 }
const WAYPOINT_OPTIONS = {
  color: 'var(--color-waypoint)',
  fillColor: 'var(--color-waypoint)',
  fillOpacity: 1,
}
// The waypoint whose options are open, or whose move is armed (FR-014): the
// same marking carries both, since it's also what tells a touch user which
// waypoint an armed move applies to, where there is no cursor to say so.
const WAYPOINT_OPTIONS_EDITING = {
  color: 'var(--color-waypoint-selected)',
  fillColor: 'var(--color-waypoint-selected)',
  fillOpacity: 1,
}

type WaypointMarkerProps = {
  waypoint: Waypoint
  radius: number
  isEditing: boolean
  onClick: (waypoint: Waypoint) => void
}

/** One waypoint dot. Memoised on its waypoint object, editing state and click
 * handler so that adding the fiftieth waypoint — or opening options on one of
 * them — does not hand Leaflet a new position, or re-render, for the other
 * forty-nine; `waypoint` keeps its identity across renders for any waypoint
 * an edit doesn't touch (`useRoute`'s `filter`/`map` preserve unaffected
 * entries), and `onClick` is stable regardless of which waypoint is being
 * edited (see `handleMarkerClick` below). */
const WaypointMarker = memo(function WaypointMarker({
  waypoint,
  radius,
  isEditing,
  onClick,
}: WaypointMarkerProps) {
  const center = useMemo((): [number, number] => [waypoint.lat, waypoint.lng], [waypoint.lat, waypoint.lng])
  const eventHandlers = useMemo(
    () => ({
      // A click on a marker must act on that waypoint alone (FR-003) — not
      // also reach the map's own click handling below and place a new
      // waypoint underneath it.
      click(event: LeafletMouseEvent) {
        DomEvent.stopPropagation(event)
        onClick(waypoint)
      },
    }),
    [waypoint, onClick],
  )

  return (
    <CircleMarker
      center={center}
      radius={radius}
      pathOptions={isEditing ? WAYPOINT_OPTIONS_EDITING : WAYPOINT_OPTIONS}
      eventHandlers={eventHandlers}
    />
  )
})

/** Renders the route being drawn on the map: the snapped path and its
 * waypoints, styled distinctly from each other (FR-005), plus feedback while
 * a segment is being routed or after a failed one (UX requirement, FR-009).
 * A click on empty map adds a waypoint at the end of the route (FR-003); a
 * click on an existing waypoint opens options to delete or move it instead
 * (004-waypoint-edit-affordances). */
export function RouteLayer({
  waypoints,
  path,
  isRouting,
  error,
  onAddWaypoint,
  onDeleteWaypoint,
  onMoveWaypoint,
}: RouteLayerProps) {
  const map = useMap()
  const statusRef = useDisableMapClickPropagation<HTMLDivElement>()
  const [editState, setEditState] = useState<EditState>(NO_EDIT)
  const waypointRadius = useCoarsePointer() ? WAYPOINT_RADIUS_COARSE : WAYPOINT_RADIUS_FINE

  // A waypoint can disappear out from under an open panel or an armed move —
  // cleared, undone, or deleted (EDGE-005) — so validity is derived from the
  // current route rather than trusted from state that can go stale.
  const waypointIds = useMemo(() => new Set(waypoints.map((w) => w.id)), [waypoints])
  const selected = editState.selected && waypointIds.has(editState.selected) ? editState.selected : null
  const armed = editState.armed && waypointIds.has(editState.armed) ? editState.armed : null

  // Read by the click handlers below, which need the latest selected/armed
  // waypoint without taking on their identity — see `handleMarkerClick`.
  const editStateRef = useRef({ selected, armed })
  useEffect(() => {
    editStateRef.current = { selected, armed }
  })

  // Stable across renders: react-leaflet keeps these in effect dependencies, so
  // a fresh object each render would detach and reattach the map's click
  // handler, and hand the polyline a new set of positions, on every state change.
  const handlers = useMemo(
    () => ({
      click(event: { latlng: { lat: number; lng: number } }) {
        const { armed: armedId } = editStateRef.current
        const point = { lat: event.latlng.lat, lng: event.latlng.lng }
        if (armedId) {
          // The next map click is the armed waypoint's new position (FR-007);
          // it is consumed by the move, not appended as a new waypoint (FR-008).
          setEditState(NO_EDIT)
          onMoveWaypoint(armedId, point)
          return
        }
        // Dismisses any open options and still places a waypoint at the
        // click, exactly as it would with no options open (FR-012).
        setEditState(NO_EDIT)
        onAddWaypoint(point)
      },
    }),
    [onAddWaypoint, onMoveWaypoint],
  )
  const positions = useMemo(
    () => path.map((point): [number, number] => [point.lat, point.lng]),
    [path],
  )

  useMapEvents(handlers)

  // Leaflet's SVG renderer paints layers in the order they were added to the
  // map, not JSX order — the polyline mounts only once a first segment
  // resolves, by which point the first two waypoints' own markers already
  // exist, so without this the polyline would paint (and hit-test) on top of
  // them wherever the path passes through a marker's position. Markers added
  // afterwards already land on top naturally; sending the line to the back
  // once, when it (re)appears, keeps every marker clickable regardless of
  // mount order.
  const polylineRef = useRef<LeafletPolyline>(null)
  const hasPolyline = positions.length > 1
  useEffect(() => {
    polylineRef.current?.bringToBack()
  }, [hasPolyline])

  // Stable identity regardless of which waypoint is selected/armed, so an
  // unrelated marker's memoised props don't change when another one is edited.
  const handleMarkerClick = useCallback(
    (waypoint: Waypoint) => {
      const { selected: selectedId, armed: armedId } = editStateRef.current
      if (armedId) {
        // Clicking the armed waypoint again cancels the move (FR-009);
        // clicking any other one is a map click the move consumes (FR-008),
        // landing the waypoint at that marker's own position.
        setEditState(NO_EDIT)
        if (waypoint.id !== armedId) {
          onMoveWaypoint(armedId, { lat: waypoint.lat, lng: waypoint.lng })
        }
        return
      }
      if (selectedId === waypoint.id) {
        setEditState(NO_EDIT) // clicking the open waypoint again closes it (FR-012)
        return
      }
      setEditState({ selected: waypoint.id, armed: null }) // at most one open at a time (FR-004)
    },
    [onMoveWaypoint],
  )

  const handleDelete = useCallback(
    (id: string) => {
      setEditState(NO_EDIT)
      onDeleteWaypoint(id)
    },
    [onDeleteWaypoint],
  )

  const handleChooseMove = useCallback((id: string) => {
    setEditState({ selected: null, armed: id })
  }, [])

  // Escape cancels an armed move, or closes an open panel, without changing
  // the route (FR-009, FR-012). Pointer-only editing's one keyboard escape
  // hatch — not the start of keyboard parity (requisites NFR).
  useEffect(() => {
    if (!selected && !armed) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setEditState(NO_EDIT)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selected, armed])

  // While armed, the map cursor says "this click relocates a waypoint", never
  // the crosshair that promises a new one (FR-013). An inline style with
  // `!important` priority is the only override guaranteed to beat the
  // stylesheet's own `!important` crosshair (MapView.module.css) regardless
  // of rule order.
  useEffect(() => {
    const container = map.getContainer()
    if (armed) {
      container.style.setProperty('cursor', 'move', 'important')
    } else {
      container.style.removeProperty('cursor')
    }
    return () => {
      container.style.removeProperty('cursor')
    }
  }, [armed, map])

  const selectedWaypoint = selected ? waypoints.find((w) => w.id === selected) : undefined

  return (
    <>
      {hasPolyline && (
        <Polyline
          ref={polylineRef}
          positions={positions}
          pathOptions={PATH_OPTIONS}
          // A layer-construction option, not a style: `pathOptions` is applied
          // with Leaflet's `setStyle`, which cannot make an already-interactive
          // layer inert, so this has to be its own prop to take effect at all.
          interactive={false}
        />
      )}
      {waypoints.map((waypoint) => (
        <WaypointMarker
          key={waypoint.id}
          waypoint={waypoint}
          radius={waypointRadius}
          isEditing={waypoint.id === selected || waypoint.id === armed}
          onClick={handleMarkerClick}
        />
      ))}
      {selectedWaypoint && (
        <WaypointOptionsPanel
          style={panelPlacement(
            map.latLngToContainerPoint([selectedWaypoint.lat, selectedWaypoint.lng]),
            map.getSize(),
            waypointRadius,
          )}
          onDelete={() => handleDelete(selectedWaypoint.id)}
          onMove={() => handleChooseMove(selectedWaypoint.id)}
        />
      )}
      {/* Mounted even with nothing to report, so assistive technology is
       * already observing the region when a message arrives — a live region
       * inserted together with its first message is announced unreliably.
       * Empty, it has no panel of its own: see `.status:not(:empty)`. */}
      <div ref={statusRef} className={styles.status} role="status">
        {isRouting && <span>Routing…</span>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </>
  )
}
