# routes

A simple web app to draw a route on a map and know how many kilometres it is.
Search for an address, click along the map to build a route, and see the
distance update live. No account, nothing saved — see `docs/PRODUCT.md`.

Status: **Slice 1 of 3 shipped** — the map screen and address search. Route
drawing, distance, and undo/clear land in later slices (see
`.workflow/implementation-plans/001-map-route-drawing.md`).

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
```

No configuration is required to run what's built so far: the map (OpenStreetMap
tiles) and address search (Nominatim) both work with no API key.

## Testing

```bash
npm test           # unit/integration tests (Vitest)
npm run build       # production build, required before e2e
npm run e2e:install # one-time: installs the Playwright browser
npm run e2e         # end-to-end tests (Playwright, against the build)
```

Both suites run fully offline: third-party requests (map tiles, Nominatim,
and later the routing provider) are intercepted with fixture responses, so
nothing here depends on live third-party availability or quota. See
`CLAUDE.md` for the full testing conventions.

## Configuration and API keys

Nothing to configure yet. **Starting with Slice 2** (route drawing), the app
will need a routing-provider API key to snap segments to real streets. Get
one ready now if you want to move straight into that slice:

- **OpenRouteService** (default provider) — free tier, no credit card.
  1. Create an account at <https://openrouteservice.org/dev/#/signup>.
  2. Generate a token from the dashboard (Dashboard → Request a token → give
     it a name, standard plan is enough for personal use).
  3. The free tier is capped (2,000 requests/day at the time of writing) —
     plenty for a single-person tool, but do not commit the key or point it
     at anything that could scale past that.
- **Mapbox Directions** (drop-in alternative, added in Slice 2's US-005) —
  free tier included with any Mapbox account.
  1. Create an account at <https://www.mapbox.com/>.
  2. Copy your **default public token** from
     <https://account.mapbox.com/access-tokens/>, or create a scoped one with
     only the Directions API enabled.

Because this app has no backend, whichever key you use ships inside the
client bundle and is publicly visible. Before deploying anywhere public:

- **Restrict the key** to your deployed domain (URL/referrer restriction —
  both providers support this from their dashboard).
- **Never use a key with billing exposure** beyond its free tier.

Once Slice 2 lands, the build-time environment variables that select the
provider and carry the key will be documented here and in `.env.example`.

## Documentation

- `docs/PRODUCT.md` — what this is and isn't, for whom.
- `docs/ARCHITECTURE.md` — stack and shape.
- `docs/DESIGN.md` — design tokens for UI work.
- `CLAUDE.md` — code layout and testing conventions.
