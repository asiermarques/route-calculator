# Product

## What this is

**Route Calculator** — a simple web app to draw a route on a map and know how
many kilometres it is.

The user searches for an address to position the map, then clicks along the
map to place waypoints. The app snaps each new segment to the real street
network (like Strava's route builder) and keeps a running total of the
distance.

## Who it is for

A single person planning a run, ride or walk who wants a quick distance figure
for a route they have in mind. No account, no social features, no activity
tracking.

## Product principles

- **Simple over complete.** One screen, one job: draw and measure.
- **No account, no friction — after one step on a public deploy.** The app
  itself has no login, ever. A build you run locally is usable the moment it
  loads, exactly as before. A build deployed for other people to use asks each
  visitor, once per visit, for their own routing-provider key — the app
  doesn't have a backend to pay for everyone's routing, so it doesn't hold
  one — and then behaves identically to the local case. See
  `docs/adr/0001-user-supplied-routing-api-key-in-browser-storage.md`.
- **Real-world distances.** Segments follow streets and paths, not straight
  lines, so the kilometre figure is trustworthy.
- **Open data first.** Map tiles and address search come from OpenStreetMap
  data; routing uses a third-party provider the visitor (or, locally, `.env`)
  chooses.

## In scope

- Address search that centres the map.
- Click-to-add waypoints with street snapping, with a hint over an empty map
  saying so — the map is the input and nothing else on screen says it — which
  retires itself after a few seconds or on the first waypoint, whichever comes
  first.
- Live total distance in kilometres.
- Remove the last waypoint, clear the whole route.
- Delete any single waypoint, wherever it sits in the route — its neighbours
  re-join with one newly routed segment, and the rest of the route survives
  (`004-waypoint-edit-affordances`, superseding `001`'s "undo the last
  waypoint or start over" as the only correction).
- Move a single waypoint to a new spot without redrawing the route around it —
  the segments on either side follow the streets to its new position, and its
  place in the route order is unchanged (`004-waypoint-edit-affordances`,
  reversing `001` NOGOAL-004's deferral of repositioning).
- On a public deploy, a screen for the visitor's own routing-provider choice
  and API key — not stored, not sent anywhere but that provider — asked once
  per visit and reachable again at any time from within the app, to correct
  a mistyped key or a wrong provider without losing the drawn route. Being the
  app's first screen and, for anyone who leaves, its only one, it says what the
  app does before it asks for anything, and puts the key in terms of what the
  visitor gets by supplying it: their own free routing account, no sign-up
  here, no quota shared with strangers. The
  screen tells the visitor what a leaked key would cost for the provider
  they picked before they type it in: OpenRouteService's key cannot be tied
  to this app's domain at all, so a leak is usable from anywhere and repeated
  abuse can get their only account blocked; Mapbox's can, and the screen says
  how (`003-routing-key-exposure-hardening`,
  `docs/adr/0002-restrict-and-contain-the-browser-held-routing-key.md`).

## Explicit non-goals

- User accounts, login, or any server-side user data.
- Saving or sharing routes (the route lives only in the open tab).
- GPX/other file import or export.
- Elevation profiles, surface types, or route grading.
- Activity recording, GPS tracking, or mobile apps.
- Multi-route management, folders, or search over past routes.

These non-goals are deliberate for the first version. Reopening any of them is
a product decision, not an implementation detail.
