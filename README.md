# routes

A simple web app to draw a route on a map and know how many kilometres it is.
Search for an address, click along the map to build a route, and see the
distance update live. No account, nothing saved — see `docs/PRODUCT.md`.

Status: **Map and route drawing shipped** — address search, route drawing
with live distance, and undo/clear (see
`.workflow/implementation-plans/001-map-route-drawing.md`) — **plus
runtime routing credentials**: a production build ships with no routing API
key, asks each visitor for their own on a blocking credentials screen, and
that screen is reachable again from within the app to correct a mistyped key
or a wrong provider, no reload needed (see
`.workflow/implementation-plans/002-visitor-routing-key-entry.md`).

## Quick start

```bash
npm install
cp .env.example .env   # then set VITE_ROUTING_API_KEY — see below
npm run dev             # http://localhost:5173
```

The map (OpenStreetMap tiles) and address search (Nominatim) work with no API
key. `.env` supplies a routing-provider key for local development only, so
`npm run dev` comes up straight into the map. Without it, `npm run dev` shows
the same credentials screen a production build shows every visitor — see
below.

## Testing

```bash
npm test           # unit/integration tests (Vitest)
npm run build       # production build, required before e2e
npm run e2e:install # one-time: installs the Playwright browser
npm run e2e         # end-to-end tests (Playwright, against the build)
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
  to leave the page for it. The 🔑 button next to the distance readout
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

## Documentation

- `docs/PRODUCT.md` — what this is and isn't, for whom.
- `docs/ARCHITECTURE.md` — stack and shape.
- `docs/DESIGN.md` — design tokens for UI work.
- `CLAUDE.md` — code layout and testing conventions.
