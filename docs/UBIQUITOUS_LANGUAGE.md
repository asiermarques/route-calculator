# Ubiquitous Language

The words this app is discussed, written and named in. One screen, one job —
draw a route and measure it — so the vocabulary is small, and the value of it
is that code, UI copy, tests and specs all use the same word for the same
thing.

## The route

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Route** | The ordered waypoints and their segments currently drawn in this browser tab. | Track, trip, itinerary, course |
| **Waypoint** | A point the visitor placed on the map, with an identity of its own that survives its neighbours changing. | Point, pin, marker, node, stop |
| **Segment** | The street-snapped line between two consecutive waypoints, carrying its own distance, and belonging to the waypoint it arrives at. | Leg, edge, stretch, section |
| **Path** | The coordinates a segment (or the whole route) is *drawn* from — geometry, never the route itself. | Line, polyline, geometry |
| **Street snapping** | The property that a segment follows the real street network instead of the straight line between its two waypoints. | Routing (too broad), matching |
| **Total distance** | The sum of the route's segments' distances, shown in kilometres — the answer the app exists to give. | Length, mileage, total |
| **Marked waypoint** | The one waypoint whose options are open or whose move is armed, drawn larger and in its own colour. | Selected, active, current, highlighted |
| **Armed move** | The state in which the next click on the map relocates the marked waypoint instead of appending a new one. | Drag, edit mode, moving |

## Corrections

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Remove last waypoint** | Drops the most recently placed waypoint and its incoming segment. | Undo, back, revert |
| **Clear** | Empties the whole route in one action, leaving the map where it is. | Reset, delete route, start over |
| **Delete** | Removes one waypoint anywhere in the route, re-joining its neighbours with one newly routed segment. | Remove (reserved for the last-waypoint correction) |
| **Move** | Relocates one waypoint without changing its place in the route order; the segments on either side re-route. | Drag, reposition, edit |

## Map and search

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Map** | The full-viewport OpenStreetMap view that is also the app's only drawing surface. | Canvas, view, viewport |
| **Address search** | Geocoding a typed address to move the map to it — it never places a waypoint. | Destination search, find route, go to |
| **Locate** | Reading the visitor's current position from the browser and centring the map on it — the address search's sibling: it moves the map and nothing else, never places a waypoint, and is never a continuous watch. Happens once automatically the moment the map becomes usable, and again on every press of the control afterwards. | GPS, find me, track, geolocate |
| **Match** | The single geocoding result the map centres on. | Result, hit, place |
| **Dormant map** | The map while it is drawn but answering no pointer, key or tab stop, which is how it sits behind the credentials screen. | Disabled, frozen, locked |

## Credentials

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Visitor** | The person using the app — there are no accounts here, so there is nobody else. | User, account, customer, member |
| **Routing provider** | The third-party service that computes a segment between two points (OpenRouteService, Mapbox Directions). | Provider (unqualified), backend, routing API, server |
| **Routing key** | The visitor's own API key or token for their chosen routing provider, held in memory for one tab and never stored. | Credential, secret, token, our key |
| **Credentials screen** | The screen that collects a routing provider and a routing key — a gate, not a login: it authenticates nobody. | Login, sign-in, onboarding, paywall |
| **Restrictable key** | A routing key the provider can tie to this deployment's own domain, making a leaked copy useless elsewhere; **unrestrictable** is the opposite, and is warned about before the key is typed. | Locked key, scoped key |
| **Development seed** | `.env` values that supply a routing provider and key to `npm run dev` only — a production build embeds none. | Config key, default key, build key |

## The shell

The app is two bars over a map, so these names come up in every conversation
about where something goes.

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Header bar** | The top panel, which *reports*: the app's name, the address search, the locate control beside it, and the total distance. | Top bar, nav, toolbar |
| **Footer toolbar** | The bottom panel, which *acts*: remove last waypoint, clear, change provider, zoom, and the routing status. | Bottom bar, footer bar, action bar |
| **Distance readout** | The display-sized total distance in the header bar. | Counter, odometer, tracker |
| **Routing status** | The live region in the footer toolbar saying a segment is in flight, or why one failed. | Toast, notification, alert |
| **Waypoint options panel** | The small panel anchored to a waypoint offering *Delete* and *Move*. | Popup, context menu, tooltip |
| **Map hint** | The one-off, untouchable pill over an empty map saying the map is where a route starts; it leaves on a timer or on the first waypoint. | Tooltip, onboarding, tour, banner |

## Relationships

- A **Route** is an ordered list of **Waypoints**, plus one **Segment** for
  every waypoint after the first — so *n* waypoints have *n − 1* segments once
  nothing is in flight.
- A **Segment** belongs to the **Waypoint** it arrives at, never to an index:
  that is what lets a **Delete** or a **Move** in the middle of a route replace
  exactly the right ones.
- **Total distance** is the sum of the **Route**'s **Segments** — never the
  straight-line distance between **Waypoints**.
- One **Segment** costs exactly one call to the **Routing provider**; a
  **Delete** in the middle costs one, a **Move** in the middle costs two.
- A **Visitor** supplies one **Routing key** for one **Routing provider** per
  visit. Neither the key nor the **Route** survives a reload.
- The **Map hint** and the **Waypoint options panel** are the only things that
  float over the **Map**; every control belongs to the **Header bar** or the
  **Footer toolbar**.

## Example dialogue

> **Dev:** "If the visitor deletes a **waypoint** in the middle, do we re-route
> the whole **route**?"

> **Domain expert:** "No — only the two neighbours. One new **segment** joins
> them, and it belongs to the waypoint it arrives at. Everything else keeps the
> **path** it already has."

> **Dev:** "And the **total distance** just drops by the two old **segments**
> and gains the new one?"

> **Domain expert:** "Right. It is always the sum of the **segments** actually
> drawn — never the straight line between **waypoints**, even for a second
> while the new one is in flight."

> **Dev:** "What if that call fails? Do we leave the **route** half-edited?"

> **Domain expert:** "Never. The **routing provider** failing is a normal
> condition, not an exception: the edit is reverted whole, and the **routing
> status** says so. The **visitor** keeps the **route** they had, and their
> **routing key** never leaves the tab either way."

## Flagged ambiguities

- **"path" means geometry, not "route".** In this codebase `path` is the list
  of coordinates a polyline is drawn from (`RouteSegment.path`, `useRoute`'s
  memoised `path`). The thing a visitor draws is a **Route**. Never write
  "path" for the concept.
- **"leg" is loose for Segment.** It appears once, in the credentials screen's
  intro ("every leg follows real streets"). Recommendation: keep **Segment**
  canonical everywhere else, and treat that one line as deliberate plain-English
  marketing copy or change it to "segment" — but do not let "leg" spread into
  code, tests or specs.
- **"undo" survives in code for a control deliberately *not* called Undo.**
  `useRoute.undo`, `canUndo` and `onUndo` back a button labelled *Remove last
  waypoint*, named that way because per-waypoint **Delete** and **Move** are not
  reversible and "Undo" would promise they are. Recommendation: the UI label is
  canonical; rename the internals to `removeLastWaypoint` when they are next
  touched, and never reintroduce "Undo" in copy.
- **"key", "API key", "credential" and "token" are used for one thing.**
  Canonical is **Routing key**. The field on the credentials screen stays
  labelled *API key* because that is what both providers call it in their own
  dashboards — that is the one blessed exception.
- **"bottom bar" / "footer" for the Footer toolbar.** `README.md` says "bottom
  bar" and `ZoomControls.tsx` says the same in a comment. Canonical is **Footer
  toolbar** — it is the bar things are *done* from, which is exactly what
  distinguishes it from the **Header bar**.
- **"provider" unqualified.** The app talks to three third parties — the
  **routing provider**, OpenStreetMap tiles and Nominatim geocoding — and only
  the first is a "provider" in this vocabulary. Say **routing provider** in
  full, or name the service.
- **"user" has no referent here.** There are no accounts, no login and no
  server-side identity, so **Visitor** is the only person in the domain. "User"
  invites features this product has ruled out.
