# CLAUDE.md

Conventions for this project. Read `docs/PRODUCT.md` and `docs/ARCHITECTURE.md`
first — this file is about *how* to build, not *what*.

## Stack

React + TypeScript, bundled with Vite. Leaflet (via `react-leaflet`) for the
map. No backend — see `docs/ARCHITECTURE.md`.

## Code organisation

Vertical slices by feature under `src/`:

- `src/shared/` — cross-cutting concerns used by more than one slice: the map
  instance/context, build-time configuration, the routing-provider interface,
  the design tokens and fonts, the app's name/mark (`shared/brand/`), the zoom
  controls, and the header and footer bars the slices' controls are composed
  into (`shared/layout/`). Nothing feature-specific lives here.
- `src/address-search/` — the address search bar and Nominatim client.
- `src/route-drawing/` — waypoints, snapped segments, distance (later slices).
- `src/route-correction/` — undo/clear (later slice).
- `src/credentials/` — the credentials screen and the in-memory routing
  credential state (`useCredentials`) that gates the app in a production
  build. See
  `docs/adr/0001-user-supplied-routing-api-key-in-browser-storage.md`.

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

Any UI work follows `docs/DESIGN.md`. No raw colour/utility values outside
tokens — including shadows and tints, which have tokens of their own.

Fonts are **self-hosted** from `public/fonts/` (`src/shared/design/fonts.css`).
Never link a font CDN: it is a third-party origin on a page that handles a
visitor's routing key, and the production CSP allows `font-src 'self'` only.

## Mobile first

A phone is the target this UI is designed against, not a size it is checked at
afterwards. This app makes that easy to get wrong: the map fills the viewport
and every control floats on top of it absolutely positioned, so a small screen
produces no reflow, no overflow warning and no error — controls simply become
too small to hit, or drift past an edge no scrollbar reaches. Nothing tells you
except looking.

So for any new or changed UI:

- **Design the phone layout first**, then let it widen. A layout worked out at
  desktop width and then squeezed is how controls end up overlapping and panels
  end up unreachable.
- **Every interactive control gets `min-height: var(--size-control-row)`**
  (48px — a notch above the 44px a finger needs, see `docs/DESIGN.md`) —
  buttons, text fields, selects. `input` and `select` also take
  `--font-ui-field` (16px), which is what stops mobile Safari zooming the page
  in on focus and never zooming back out.
- **Any panel that can outgrow the viewport must scroll to both ends.** Centre
  it with `margin: auto` on the panel, never with `align-items`/
  `justify-content` on the scroller — a centred flex item overflows the start
  edge too, and that half cannot be scrolled to.
- **Touch has no hover and no cursor.** Anything the cursor communicates needs
  a second, visible carrier on touch (the marked waypoint is the existing
  example). Sizes Leaflet takes as numbers rather than CSS — marker radii —
  come from `useCoarsePointer`, not a constant.
- **A new control goes in one of the two bars, not on the map.** The app's
  name, the address search, the distance and the change-provider button share
  the header (`src/shared/layout/AppHeader`); add-waypoint, undo/clear, the
  routing status and zoom share the footer (`AppFooter`). Both stack to two
  rows on a phone, and `App.tsx` fills their slots, so the slices the controls
  come from still don't import each other. Nothing else floats over the map
  except the waypoint options panel, which is anchored to its waypoint.
- **Cover it in `e2e/mobile.spec.ts`**, which runs at phone viewports with
  `hasTouch`/`isMobile` on, and add the control to the touch-target sweep
  there. `e2e/overlay-layout.spec.ts` separately asserts that no two overlays
  cover each other at phone, tablet and desktop widths — a new overlay belongs
  in its list. Unit tests cannot catch any of this: jsdom has no layout.
- Read `docs/DESIGN.md` "Rules" before changing a size or an offset. Both bars
  are built from `--size-control-row`, so changing a control's height without
  going through that token silently changes how the bar around it stacks and
  wraps.

## Configuration

The routing provider and its API key are supplied by the visitor at runtime,
via the credentials screen (`src/credentials/`) — a production build embeds
no key. `VITE_ROUTING_PROVIDER`/`VITE_ROUTING_API_KEY` (Vite
`import.meta.env`, documented in `.env.example`) are a **development-only**
convenience that seeds the same state so `npm run dev` doesn't block on the
screen; they have no effect on a production build even if set at build time.
Never commit real API keys. See `docs/ARCHITECTURE.md` for the constraints
that follow from a key that can never be kept secret from the browser it
runs in.

## Prohibited patterns

- No transactions/persistence of any kind — this app has none, by design.
- No hand-rolled request-body validation — not applicable (no backend), but if
  a shared parsing/validation helper is introduced for external API responses,
  keep it in `src/shared/`, not duplicated per slice.
- No `TODO` placeholders for in-scope work.
- No feature flags or "for later" parameters.
- **No third-party script loaded into the app's origin** — no analytics, chat
  widget, heatmap, embedded player, or similar — for as long as the app
  handles a visitor's routing API key. This is a security invariant, not a
  style preference: the production Content-Security-Policy
  (`src/shared/net/contentSecurityPolicy.ts`) is what stands between script
  running on this origin and a visitor's key leaving it, and third-party code
  on the origin is the realistic way that policy gets defeated from the
  inside. See `docs/adr/0002-restrict-and-contain-the-browser-held-routing-key.md`.
- **No API key written to `console`, to an error message, or to any
  telemetry/error-reporting destination** — the current provider and geocoding
  errors report only what service failed and how (never the key or the full
  request URL), and any future error-reporting integration must preserve that
  rather than capture the raw request (`docs/adr/0002-restrict-and-contain-the-browser-held-routing-key.md`).
