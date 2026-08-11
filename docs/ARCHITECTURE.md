# Architecture

## Shape

A static single-page application. There is no backend of our own: the browser
talks directly to third-party map, geocoding and routing services. The build
output is plain static files, deployable to any static host.

## Stack

- **React + TypeScript**, bundled with **Vite**.
- **Leaflet** for the map, with raster tiles from OpenStreetMap.
- **Nominatim** (OpenStreetMap) for address geocoding.
- **Routing provider**: pluggable. Two implementations are supported:
  - **Mapbox Directions**
  - **OpenRouteService**

  Both are accessed behind a single internal routing interface so the rest of
  the app is unaware of which one is active. In a production build, the
  active provider and its API key are supplied at runtime by the visitor, on
  a blocking credentials screen shown before anything else — a production
  build ships with no key at all (`src/credentials/`,
  `docs/adr/0001-user-supplied-routing-api-key-in-browser-storage.md`). That
  screen is reachable again from within the running app, as a modal over the
  still-mounted map, so a visitor can correct a mistyped key or a wrong
  provider without a reload discarding the route they've drawn. In
  development, `VITE_ROUTING_PROVIDER`/`VITE_ROUTING_API_KEY` from `.env`
  seed the same state so `npm run dev` still needs no setup.

## State

All application state is in memory in the browser. Nothing is persisted:
no localStorage, no cookies, no server storage. Reloading the page discards
the current route — and, in a production build, the routing credential the
visitor supplied, which returns them to the credentials screen
(`src/credentials/useCredentials.ts`). This follows directly from the
"no account, ephemeral session" product decision, and the credential is
treated as no exception to it (`docs/adr/0001-user-supplied-routing-api-key-in-browser-storage.md`).

## Code organisation

Vertical slices by feature (e.g. `address-search`, `route-drawing`), each
owning its UI, state and service calls. Cross-cutting concerns (map instance,
configuration, the routing provider interface, design tokens and fonts, the
app's name/mark, the header and footer bars, the zoom control) live in
`src/shared/`. See `CLAUDE.md` for the
current slice list and testing conventions.

The two bars (`src/shared/layout/AppHeader`, `AppFooter`) are the shell, not a
feature: they know where a control goes, and `App.tsx` is the only place that
knows which slice each of them comes from. Same arrangement as the route state
below — composition happens in `App.tsx` so that slices never reach for each
other. Zooming is the app's own control too (`src/shared/map/ZoomControls`)
rather than Leaflet's corner widget, so that every control lives in a bar; it
drives the same map instance through `useMap`.

Route state (waypoints, snapped segments, distance) is owned by one hook in
`route-drawing` and passed down as props to the overlay controls in
`route-correction` — slices don't import each other, so state that's shared
across slices is lifted to `App.tsx`, which composes them. Per-waypoint
delete and move (`004-waypoint-edit-affordances`) extend that same hook
(`useRoute`'s `deleteWaypoint`/`moveWaypoint`) rather than introducing a
second owner of route state; both go through the hook's existing ordered
queue, alongside waypoint additions, so an edit issued while an earlier
segment is still routing can't land out of order. Which waypoint's options
are open, and which one's move is armed, is UI-only interaction state kept in
`RouteLayer` itself and derived against the current waypoint list on every
render, rather than invalidated by hand when a waypoint disappears out from
under it (cleared, undone, or deleted) — arming a move is this app's first
"mode", and `RouteLayer` also gives it a cursor distinct from the map's
otherwise-permanent crosshair by setting an inline style on the Leaflet
container directly, the one override guaranteed to beat the crosshair's own
CSS regardless of stylesheet load order (`docs/DESIGN.md`).

Every overlay panel rendered inside the map (`src/shared/map/MapView`) uses
`src/shared/map/useDisableMapClickPropagation`, so interacting with the panel
(clicking a button, typing) doesn't also bubble through to Leaflet's own
click handling — which route-drawing listens on to place waypoints — and get
misread as a click on the map itself.

## Testing

Vitest + React Testing Library for unit/integration tests (colocated with
source), Playwright for end-to-end tests (`e2e/`), running against a real
production build. Both suites intercept third-party network calls with
fixture responses — they run offline and don't depend on live third-party
availability. Full conventions in `CLAUDE.md`.

## Design system

UI work follows `docs/DESIGN.md` — a small set of CSS custom-property tokens
(`src/shared/design/tokens.css`), loaded once globally. No raw colour or
spacing values in component styles.

## Constraints and consequences

- **API keys are public, wherever they come from.** With no backend, a
  routing provider key can never be kept secret from the browser it runs in.
  In development, `.env`'s key is local to that machine. In a production
  build, no key ships in the bundle at all — each visitor supplies their own
  at runtime, and it exists only in that visitor's browser tab for the
  session (ADR 0001). Either way, whoever holds the key is responsible for
  scoping it to the minimum required and keeping it off any tier with billing
  exposure — the credentials screen tells visitors this. **The two providers
  are not equivalent here:** a Mapbox public (`pk.`) token can be restricted
  to the deployed domain, so a stolen one is close to worthless; OpenRouteService
  documents no domain or referrer restriction, so a stolen ORS key is usable
  from anywhere. See
  `docs/adr/0002-restrict-and-contain-the-browser-held-routing-key.md`.
- **Third-party rate limits apply.** Nominatim's usage policy requires a
  reasonable request rate; address search must be debounced and must not be
  called per keystroke without throttling. An empty query is not sent at all.
- **Availability is external.** Geocoding and routing failures are normal
  operating conditions, not exceptions, and must be surfaced to the user
  rather than swallowed. That includes a service that accepts a connection and
  then never answers: every third-party call goes through
  `src/shared/http/fetchWithTimeout.ts` and gives up rather than hanging, since
  routing requests are queued and one that never settles would stop the queue.
- **Third-party responses are the only untrusted input.** There is no
  server-side validation because there is no shared data and no other users'
  data to isolate — but the shapes coming back from Nominatim and the routing
  providers are outside this app's control, and a missing or unparseable
  coordinate would otherwise reach Leaflet as `NaN`. They are checked in
  `src/shared/http/parse.ts` before use, and a bad shape takes the same path as
  any other failed request.
- **Nominatim identifies callers by `Referer`.** A browser cannot set a custom
  `User-Agent`, so the page's referrer is what satisfies the usage policy. A
  deployment that sends `Referrer-Policy: no-referrer` would break address
  search.
- **A production build carries a closed Content-Security-Policy.** `connect-src`
  permits only the app's own origin, the tile host, Nominatim and the two
  routing provider APIs — the four outbound origins declared once in
  `src/shared/net/outboundOrigins.ts` and consumed from there by every module
  that requests one, so the origins a request can reach and the origins the
  policy allows cannot independently drift (checked in
  `src/shared/net/outboundOrigins.test.ts`). The policy is generated by
  `src/shared/net/contentSecurityPolicy.ts` and injected into the built
  `index.html` only, by a build-only Vite plugin (`vite.config.ts`) — `npm run
  dev` ships without it, since Vite's dev server needs inline scripts and an
  HMR websocket the policy would block. Executing script on the origin is
  therefore not by itself enough to exfiltrate a visitor's routing key; a
  malicious browser extension and a supply-chain compromise of a dependency
  both execute inside the page's own context and are accepted as residual
  risks the policy cannot address (`docs/adr/0002-restrict-and-contain-the-browser-held-routing-key.md`).
- **Nothing the app needs comes from a third-party origin except the four
  services above.** That is why the two typefaces are copied into
  `public/fonts/` and served from this origin rather than linked from a font
  CDN: a CDN would be a fifth origin in the policy, and script or a stylesheet
  from it would run on the page that holds the visitor's key. `font-src` is
  therefore `'self'` alone, and is not optional — under `default-src 'none'`
  the browser would otherwise block the app's own fonts.
