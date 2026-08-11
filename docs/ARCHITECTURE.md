# Architecture

## Shape

A static single-page application. There is no backend of our own: the browser
talks directly to third-party map, geocoding and routing services. The build
output is plain static files, deployable to any static host.

## Stack

- **React + TypeScript**, bundled with **Vite**.
- **Leaflet** for the map, with raster tiles from OpenStreetMap.
- **Nominatim** (OpenStreetMap) for address geocoding.
- **Routing provider**: pluggable, selected by configuration. Two
  implementations are supported:
  - **Mapbox Directions**
  - **OpenRouteService**

  Both are accessed behind a single internal routing interface so the rest of
  the app is unaware of which one is active. The active provider and its API
  key come from build-time environment configuration.

## State

All application state is in memory in the browser. Nothing is persisted:
no localStorage, no cookies, no server storage. Reloading the page discards
the current route. This follows directly from the "no account, ephemeral
session" product decision.

## Code organisation

Vertical slices by feature (e.g. `address-search`, `route-drawing`), each
owning its UI, state and service calls. Cross-cutting concerns (map instance,
configuration, the routing provider interface) live in `src/shared/`. See
`CLAUDE.md` for the current slice list and testing conventions.

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

- **API keys are public.** With no backend, any routing provider key ships in
  the client bundle. Keys must be restricted by HTTP referrer/domain and scoped
  to the minimum required, and must not be keys with billing exposure beyond a
  capped free tier.
- **Third-party rate limits apply.** Nominatim's usage policy requires a
  reasonable request rate; address search must be debounced and must not be
  called per keystroke without throttling.
- **Availability is external.** Geocoding and routing failures are normal
  operating conditions, not exceptions, and must be surfaced to the user
  rather than swallowed.
- **No server-side validation exists.** There is no trust boundary to defend
  because there is no shared data and no other users' data to isolate.
