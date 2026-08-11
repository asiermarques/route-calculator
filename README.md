# routes

A simple web app to draw a route on a map and know how many kilometres it is.
Search for an address, click along the map to build a route, and see the
distance update live. No account, nothing saved — see `docs/PRODUCT.md`.

Status: **All 3 slices shipped** — map and address search, route drawing with
live distance, and undo/clear (see
`.workflow/implementation-plans/001-map-route-drawing.md`).

## Quick start

```bash
npm install
cp .env.example .env   # then set VITE_ROUTING_API_KEY — see below
npm run dev             # http://localhost:5173
```

The map (OpenStreetMap tiles) and address search (Nominatim) work with no API
key. Drawing a route needs a routing-provider API key — the app fails clearly
at startup if it's missing or misconfigured.

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
needs `VITE_ROUTING_PROVIDER` and `VITE_ROUTING_API_KEY` set in the
environment (any non-empty key works — the e2e suite mocks the routing
provider's network calls, it never reaches the real service). See
`CLAUDE.md` for the full testing conventions.

## Configuration and API keys

Drawing a route needs a routing-provider API key, set via build-time
environment variables (`VITE_ROUTING_PROVIDER`, `VITE_ROUTING_API_KEY` — see
`.env.example`). `VITE_ROUTING_PROVIDER` is one of `openrouteservice` or
`mapbox`; switching provider is a configuration change only.

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

Because this app has no backend, whichever key you use ships inside the
client bundle and is publicly visible. Before deploying anywhere public:

- **Restrict the key** to your deployed domain where the provider supports it.
  Mapbox does: use a public `pk.` token and set its allowed URLs from the
  dashboard. **OpenRouteService does not** — its key is a plain bearer
  credential, usable from anywhere once leaked, and repeated abuse can get the
  account blocked. Prefer Mapbox for anything publicly reachable; ORS is fine
  for local or single-operator use. See
  `docs/adr/0002-restrict-and-contain-the-browser-held-routing-key.md`.
- **Never use a key with billing exposure** beyond its free tier.

If `VITE_ROUTING_PROVIDER` names an unknown provider, or `VITE_ROUTING_API_KEY`
is unset, the app shows a clear startup error instead of the map.

## Documentation

- `docs/PRODUCT.md` — what this is and isn't, for whom.
- `docs/ARCHITECTURE.md` — stack and shape.
- `docs/DESIGN.md` — design tokens for UI work.
- `CLAUDE.md` — code layout and testing conventions.
