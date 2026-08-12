# Route Calculator

A simple web app to draw a route on a map and know how many kilometres it is.
Search for an address, click along the map to build a route, and watch the
distance update live. Segments follow real streets and paths — like a route
builder for a run, ride or walk — so the figure is one you can trust.

No account, no tracking, nothing saved: the route lives in the open tab and
that is all. See `docs/PRODUCT.md` for what this is and isn't.

**Status: usable.** Address search, click-to-draw routing with a live total,
per-waypoint delete and move, undo/clear, and — on a public deploy — a
credentials screen where each visitor supplies their own routing key. Plans
and requirements for each of those live in `.workflow/`.

## Quick start

Requires Node **20.19+** or **22.12+** (what Vite 8 needs).

```bash
npm install
cp .env.example .env    # then set VITE_ROUTING_API_KEY — see below
npm run dev             # http://localhost:5173
```

The map (OpenStreetMap tiles) and address search (Nominatim) work with no API
key at all. `.env` supplies a routing-provider key for local development only,
so `npm run dev` comes up straight into the map. Leave it unset and you get
the same credentials screen a production build shows every visitor.

## Using it

- **Find where you're going.** Type an address in the header bar and press
  Search. This only moves the map — it never places a waypoint.
- **Draw the route.** Click (or tap) the map to add a waypoint — a hint over an
  empty map says so, and gets out of the way once you have. From the second
  one on, each new segment is routed along real streets, and the total in the
  header updates. `Routing…` in the bottom bar means a segment is in flight.
- **Fix a waypoint.** Click one to open its options:
  - **Delete** removes it and re-joins its neighbours with one new segment.
  - **Move** arms it — the next click on the map is its new position, and both
    sides re-route. Click the waypoint again, or press `Esc`, to cancel.
- **Start over.** *Remove last waypoint* drops the most recent one; *Clear*
  empties the route. Both are in the footer toolbar, with the key button that
  reopens the credentials screen.
- **Without a mouse.** Arrow keys pan the map and the zoom buttons work from
  the keyboard, as do *Remove last waypoint* and *Clear*. Placing a waypoint
  does not: it is a click on the map, and the control that used to drop one at
  the map's centre has been removed, so drawing a route needs a pointer or a
  touchscreen. Editing an existing waypoint is pointer/touch-only too.
- **Reloading discards everything**, including the routing key on a public
  deploy. That is deliberate, not an oversight.

## Testing

```bash
npm test            # unit/integration tests (Vitest)
npm run build       # production build, required before e2e
npm run e2e:install # one-time: installs the Playwright browser
npm run e2e         # end-to-end tests (Playwright, against the build)
npm run lint        # oxlint
```

Both suites run fully offline: third-party requests (map tiles, Nominatim,
and the routing provider) are intercepted with fixture responses, so nothing
here depends on live third-party availability or quota. `npm run build`
needs no environment variables — a production build never embeds a routing
API key. The e2e suite supplies a throwaway key through the credentials
screen itself, the way a real visitor would (`e2e/support/supply-credentials.ts`).
See `CLAUDE.md` for the full testing conventions.

## Configuration and API keys

Drawing a route needs a routing-provider API key. Where it comes from depends
on the build:

- **Production build (`npm run build`)** — no key is ever embedded. The app
  opens on a credentials screen; the visitor picks a provider and pastes
  their own key, which is held in memory for that browser tab only, sent only
  to the chosen provider, and gone on reload. The screen carries the same
  how-to-get-a-key guidance below, inline, so a first-time visitor never has
  to leave the page for it. The key button in the footer toolbar
  reopens the screen at any time — to fix a mistyped key or switch provider —
  without reloading or losing the drawn route. See
  `docs/adr/0001-user-supplied-routing-api-key-in-browser-storage.md`.
- **Local development (`npm run dev`)** — `.env`'s `VITE_ROUTING_PROVIDER`
  and `VITE_ROUTING_API_KEY` (see `.env.example`) seed the same state, so the
  screen doesn't block. Leave them unset to develop against the screen
  itself.

`VITE_ROUTING_PROVIDER` is one of `openrouteservice` or `mapbox`.

- **OpenRouteService** (`openrouteservice`) — free tier, no credit card.
  1. Create an account at <https://openrouteservice.org/dev/#/signup>.
  2. Generate a token from the dashboard (Dashboard → Request a token → give
     it a name, standard plan is enough for personal use).
  3. The free tier is capped (2,000 requests/day at the time of writing) —
     plenty for a single-person tool, but do not commit the key or point it
     at anything that could scale past that.
- **Mapbox Directions** (`mapbox`) — free tier included with any Mapbox
  account.
  1. Create an account at <https://www.mapbox.com/>.
  2. Copy your **default public token** from
     <https://account.mapbox.com/access-tokens/>, or create a scoped one with
     only the Directions API enabled.

A routing-provider key can never be kept secret from the browser it runs in,
regardless of who typed it in. Whoever holds one should:

- **Restrict the key** to your deployed domain where the provider supports it.
  Mapbox does: use a public `pk.` token and set its allowed URLs from the
  dashboard. **OpenRouteService does not** — its key is a plain bearer
  credential, usable from anywhere once leaked, and repeated abuse can get the
  account blocked. Prefer Mapbox for anything publicly reachable; ORS is fine
  for local or single-operator use. See
  `docs/adr/0002-restrict-and-contain-the-browser-held-routing-key.md`.
- **Never use a key with billing exposure** beyond its free tier.

A key the provider rejects isn't checked at entry time — it surfaces the same
way any other routing failure does, the next time a segment is routed.

## Deploying

`npm run build` produces plain static files in `dist/`, deployable to any
static host. There is no backend and no build-time configuration: the build
takes no environment variables, and each visitor supplies their own routing
key at runtime. Four things are worth knowing before putting it on a domain:

- **The Content-Security-Policy ships inside `dist/index.html`**, as a `<meta>`
  tag generated from `src/shared/net/outboundOrigins.ts`. It is what stands
  between script running on your origin and a visitor's key leaving it. If your
  host also sends a CSP header, it must not be looser than that policy — and
  `frame-ancestors` only takes effect from a header, so sending one is an
  improvement, not a duplication.
- **Do not send `Referrer-Policy: no-referrer`.** A browser can't set a custom
  `User-Agent`, so the page's referrer is what identifies this app to
  Nominatim; stripping it breaks address search and violates their usage
  policy.
- **The tiles come from OpenStreetMap's own servers**, which are donated
  infrastructure with a [usage policy](https://operations.osmfoundation.org/policies/tiles/)
  aimed at low-volume use. A deployment with real traffic should point
  `OSM_TILE_URL` (`src/shared/map/constants.ts`) at its own tile provider, and
  add that origin to `outboundOrigins.ts` so the policy follows.
- **Never add a third-party script to the page** — analytics, chat widgets,
  embeds — for as long as the app handles visitors' routing keys. That is a
  security invariant of this project, not a style rule (`CLAUDE.md`).

## Documentation

- `docs/PRODUCT.md` — what this is and isn't, for whom.
- `docs/ARCHITECTURE.md` — stack, shape, and the constraints that follow from
  having no backend.
- `docs/DESIGN.md` — the look, the type, and the design tokens for UI work.
- `docs/adr/` — the decisions that were hard enough to write down.
- `CLAUDE.md` — code layout and testing conventions.

## Licence

[MIT](LICENSE) © 2026 Asier Marqués.

The app is MIT-licensed; what it draws and what it is built from are not all
under the same terms:

- **Map data and tiles** — © OpenStreetMap contributors, available under the
  [Open Database License](https://www.openstreetmap.org/copyright). The
  attribution shown on the map is required and must not be removed or covered.
- **Address search** — [Nominatim](https://nominatim.org/), same data, subject
  to its [usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- **Routing** — whichever provider a visitor connects, under that provider's
  own terms and quota. Route geometry from a provider is not necessarily
  redistributable; this app only draws it, and stores nothing.
- **Fonts** — Saira Condensed and Barlow, under the SIL Open Font License 1.1
  (`public/fonts/LICENSE.md`), bundled with the app.
- **Libraries** — React (MIT) and Leaflet (BSD-2-Clause), among others; see
  `package.json` and each package's own licence.
