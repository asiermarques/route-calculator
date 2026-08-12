# CLAUDE.md

How to build in this repo. Read `docs/PRODUCT.md` (what) and
`docs/ARCHITECTURE.md` (shape and constraints) first; `docs/DESIGN.md` for any
UI work, `docs/UBIQUITOUS_LANGUAGE.md` for naming.

## Stack

React + TypeScript, Vite. Leaflet via `react-leaflet`. No backend — the browser
calls Nominatim, the tile host and the routing provider directly.

## Code organisation

Vertical slices under `src/`; each owns its components, hooks, service calls
and tests. A slice may import from `src/shared/`; **slices never import each
other** — shared state and composition live in `App.tsx`.

- `src/shared/` — map instance/context, config, routing-provider interface,
  HTTP helpers (`http/`), outbound origins and CSP (`net/`), design tokens and
  fonts (`design/`), name/mark (`brand/`), zoom controls, and the header/footer
  bars (`layout/`). Nothing feature-specific.
- `src/address-search/` — search bar + Nominatim client.
- `src/locate-position/` — locate control (one Geolocation reading per press).
- `src/route-drawing/` — waypoints, segments, distance, routing status, hint.
  `useRoute` is the single owner of route state.
- `src/route-correction/` — undo/clear controls.
- `src/credentials/` — credentials screen and `useCredentials`, which gates a
  production build (`docs/adr/0001-…`).

## Testing

Both suites must be green before a task is done.

- `npm test` — Vitest + React Testing Library, colocated `*.test.ts(x)`.
  Network mocked with MSW; never hit real third-party services.
- `npm run e2e` — Playwright, `e2e/` (first run: `npm run e2e:install`). Runs
  against a real production build. Third-party calls are intercepted with
  `page.route(...)` and fixture responses: the suite must run offline.
- `npm run lint` (oxlint) and `npm run build` (`tsc -b && vite build`).
- jsdom has no layout. Unit tests assert *wiring* (props passed to
  `react-leaflet`); real pan/zoom/tile/layout behaviour is e2e only.

## UI

Follow `docs/DESIGN.md` — read its "Rules" section before changing any size or
offset. No raw colour, spacing, shadow or tint values outside tokens.

Fonts are self-hosted from `public/fonts/` (`src/shared/design/fonts.css`).
Never link a font CDN: production CSP allows `font-src 'self'` only.

**Mobile first.** The map fills the viewport and every control floats over it
absolutely, so a phone produces no reflow, no overflow and no error — controls
just become unhittable or drift off an edge. Nothing tells you except looking.

- Design the phone layout first, then let it widen.
- Every interactive control: `min-height: var(--size-control-row)` (48px).
  `input`/`select` also take `--font-ui-field` (16px), which stops mobile
  Safari zooming in on focus and never back out.
- A panel that can outgrow the viewport centres with `margin: auto` on the
  panel, never `align-items`/`justify-content` on the scroller — a centred flex
  item overflows the start edge too, and that half is unreachable.
- Touch has no hover and no cursor: anything the cursor communicates needs a
  second visible carrier. Sizes Leaflet takes as numbers (marker radii) come
  from `useCoarsePointer`.
- **A new control goes in one of the two bars, not on the map.** Reporting in
  the header (`shared/layout/AppHeader`: name, address search, distance),
  acting in the footer (`AppFooter`: undo/clear, change provider, routing
  status, zoom). `App.tsx` fills their slots. Both stack to two rows on a phone
  and at 60rem become a left rail (footer) facing a top-right card (header) —
  design for both: a label that fits a phone row *and* a face that works one
  control wide, where the label becomes a tooltip (`RouteControls`) or the
  control is already a glyph (`ReopenCredentialsButton`).
- Only two things float over the map besides the bars: the waypoint options
  panel and the first-run `MapHint` (`pointer-events: none`, self-dismissing).
- Cover it in `e2e/mobile.spec.ts` (phone viewports, `hasTouch`/`isMobile`) and
  add it to the touch-target sweep; add any new overlay to
  `e2e/overlay-layout.spec.ts`'s list.

## Configuration

The routing provider and key are supplied by the visitor at runtime
(`src/credentials/`); a production build embeds no key.
`VITE_ROUTING_PROVIDER`/`VITE_ROUTING_API_KEY` (`.env.example`) are a
**development-only** convenience that seeds the same state — no effect on a
production build even if set. Never commit real keys.

## Prohibited patterns

- **No third-party script on this origin** — no analytics, chat widget,
  heatmap, embedded player. Security invariant, not style: the production CSP
  (`src/shared/net/contentSecurityPolicy.ts`) is what keeps a visitor's key
  from leaving, and third-party code is how it gets defeated from the inside
  (`docs/adr/0002-…`).
- **No API key in `console`, an error message, or any telemetry/error-reporting
  destination.** Errors name the service that failed and how — never the key or
  the full request URL (`docs/adr/0002-…`).
- No persistence of any kind: no localStorage, cookies or server storage.
- External-response parsing goes through `src/shared/http/parse.ts`, not
  duplicated per slice.
- No `TODO` placeholders for in-scope work; no feature flags or "for later"
  parameters.
