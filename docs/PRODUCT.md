# Product

## What this is

A simple web app to draw a route on a map and know how many kilometres it is.

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
- **No account, no friction.** The app is usable the moment it loads.
- **Real-world distances.** Segments follow streets and paths, not straight
  lines, so the kilometre figure is trustworthy.
- **Open data first.** Map tiles and address search come from OpenStreetMap
  data; routing uses a third-party provider chosen by configuration.

## In scope

- Address search that centres the map.
- Click-to-add waypoints with street snapping.
- Live total distance in kilometres.
- Undo last waypoint, clear the whole route.

## Explicit non-goals

- User accounts, login, or any server-side user data.
- Saving or sharing routes (the route lives only in the open tab).
- GPX/other file import or export.
- Elevation profiles, surface types, or route grading.
- Activity recording, GPS tracking, or mobile apps.
- Multi-route management, folders, or search over past routes.

These non-goals are deliberate for the first version. Reopening any of them is
a product decision, not an implementation detail.
