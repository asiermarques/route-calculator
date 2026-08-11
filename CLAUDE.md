# CLAUDE.md

Conventions for this project. Read `docs/PRODUCT.md` and `docs/ARCHITECTURE.md`
first — this file is about *how* to build, not *what*.

## Stack

React + TypeScript, bundled with Vite. Leaflet (via `react-leaflet`) for the
map. No backend — see `docs/ARCHITECTURE.md`.

## Code organisation

Vertical slices by feature under `src/`:

- `src/shared/` — cross-cutting concerns used by more than one slice: the map
  instance/context, build-time configuration, the routing-provider interface.
  Nothing feature-specific lives here.
- `src/address-search/` — the address search bar and Nominatim client.
- `src/route-drawing/` — waypoints, snapped segments, distance (later slices).
- `src/route-correction/` — undo/clear (later slice).

Each slice owns its own components, hooks, service calls, and tests. A slice
may import from `src/shared/`; slices do not import from each other.

## Testing

- **Unit/integration**: Vitest + React Testing Library. Colocated with source
  as `*.test.ts(x)`. Network calls (Nominatim, routing providers) are mocked
  with MSW — never hit real third-party services from this suite.
- **E2E**: Playwright, specs under `e2e/`. Runs against a real production
  build (`npm run build && npm run preview`). Third-party network calls
  (Nominatim, tile server, routing provider) are intercepted with
  `page.route(...)` and given deterministic fixture responses — the e2e suite
  must be able to run offline and must not depend on live third-party
  availability or quota.
- Leaflet does real layout/canvas work that jsdom cannot do reliably. Unit
  tests assert *wiring* (props passed to `react-leaflet` components, mocked
  where needed); real pan/zoom/tile-load behaviour is asserted in e2e only.
- Run `npm test` for unit/integration, `npm run e2e` for e2e (first run:
  `npm run e2e:install`). Both must be green before a task is done.

## Design tokens

Any UI work follows `docs/DESIGN.md` once it exists. No raw colour/utility
values outside tokens.

## Configuration

Build-time environment variables (Vite `import.meta.env`), documented in
`.env.example`. Never commit real API keys. Provider keys are public once
bundled — see `docs/ARCHITECTURE.md` for the constraints that follow from
that.

## Prohibited patterns

- No transactions/persistence of any kind — this app has none, by design.
- No hand-rolled request-body validation — not applicable (no backend), but if
  a shared parsing/validation helper is introduced for external API responses,
  keep it in `src/shared/`, not duplicated per slice.
- No `TODO` placeholders for in-scope work.
- No feature flags or "for later" parameters.
