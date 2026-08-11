---
title: Restrict and contain the browser-held routing key
status: Proposed
date: 2026-08-11
tags: [security, frontend]
deciders: [Asier Marqués]
---

# 0002. Restrict and contain the browser-held routing key

## Context and problem statement

[ADR 0001](0001-user-supplied-routing-api-key-in-browser-storage.md) puts the
routing API key in the visitor's browser. A credential in the browser cannot be
kept secret: the key must exist wherever the call to the provider is made, and
that call is `fetch` running on the visitor's machine
(`src/shared/routing/mapboxDirectionsProvider.ts:28`,
`src/shared/routing/openRouteServiceProvider.ts:22`). Obfuscating the bundle or
encrypting the stored value changes nothing, because the network request shows
the key in clear either way.

"Secret" is therefore unavailable. The question this ADR answers is what
remains achievable: making the key hard to steal, and making a stolen key
worth little.

## Decision drivers

- **Security.** With ADR 0001, the visitor's credential is entrusted to a page
  the project controls. Residual risk should be reduced by whatever means do
  not require the server that ADR 0001 declined.
- **Cost-effectiveness.** Measures must fit a static build with no backend.
- **Maintainability.** Controls that silently stop holding when the app grows
  are worse than none; they need to be written down as invariants.

## Considered options

1. **Accept the exposure and add no controls** — rely on the provider's free
   tier absorbing any abuse.
2. **Encrypt the key in browser storage** — store a ciphertext instead of the
   raw key.
3. **Provider-side domain restriction plus a strict Content-Security-Policy** —
   make a stolen key unusable off-origin, and block exfiltration.
4. **Proxy the routing call through a server** — remove the exposure entirely.

## Decision outcome

Chosen option: **"Provider-side domain restriction plus a strict
Content-Security-Policy"**, because the two controls attack the two halves of
the problem independently and neither requires a backend.

**Restriction at the provider** is the larger lever and lives outside the
codebase. Mapbox distinguishes public (`pk.`) from secret (`sk.`) tokens and
supports an `allowedUrls` restriction on both, verified against Mapbox's token
documentation; a public token scoped to the deployed domain, with minimal
scopes and a usage cap, is close to worthless once stolen. This is the model
public tokens are designed for — their presence in a bundle is not the failure
mode, an unrestricted token is.

**A strict CSP**, and specifically a closed `connect-src`, attacks the theft
itself. Stealing the key requires sending it somewhere, and the project is in
an unusually good position to forbid that: it has four runtime dependencies
(`leaflet`, `react`, `react-dom`, `react-leaflet`), no third-party scripts in
`index.html`, and exactly four outbound origins, all declared as constants
(`src/address-search/geocode.ts:6`, `src/shared/map/constants.ts:7`, and the
two provider modules). A `connect-src` naming only those origins means that
script execution on the page is not by itself sufficient to exfiltrate the key.

Supporting measures adopted with it: the key is never written to logs or error
messages — the current provider errors report only the HTTP status, which is
correct and should stay that way; the settings input masks the key and offers
an explicit "forget key" action; and `localStorage` is preferred over
`sessionStorage`, since the latter does not help against the main threat (an
XSS occurs while the app is in use, when the key is available either way) and
only helps on shared computers, which the forget action covers.

Options rejected:

- **Option 1** leaves a stolen key fully usable, which for OpenRouteService is
  the situation regardless — see the consequences.
- **Option 2** is theatre against the realistic threat. Whatever decrypts the
  key is in the same bundle, and the decrypted key sits in memory while the app
  runs. It protects only against inspection of storage at rest, which is not
  the threat worth paying for here.
- **Option 3 vs 4:** a proxy would genuinely eliminate the exposure, but ADR
  0001 rejected the backend on grounds that still hold. Reconsider together
  with that ADR, not separately.

### Consequences

- **Good:** a key stolen from a Mapbox-backed deploy is unusable from any other
  origin. Exfiltration requires defeating `connect-src`, not merely executing
  script. Both controls are configuration, not architecture, and neither
  disturbs `docs/ARCHITECTURE.md` §Shape.
- **Trade-offs:** the realistic XSS vector in an app with no user-generated
  content is a supply-chain compromise of a dependency, so **"no third-party
  scripts" stops being a preference and becomes a security invariant** — adding
  an analytics snippet, a chat widget or a heatmap would put third-party code
  on the origin holding the visitor's credential. `docs/ARCHITECTURE.md`
  §Constraints currently treats the two routing providers as equivalent
  ("Keys must be restricted by HTTP referrer/domain"); that requirement is
  satisfiable for Mapbox and, as recorded below, not for OpenRouteService, so
  the text overstates what the project can guarantee.
- **The two providers are not equivalent under this decision.**
  OpenRouteService documents no domain or referrer restriction mechanism: its
  API key authenticates as a plain bearer credential, passed either as an
  `api_key` query parameter or in an `Authorization` header — which is how
  `src/shared/routing/openRouteServiceProvider.ts:25` sends it. A stolen ORS
  key is therefore usable from anywhere, and two further terms make the
  consequence worse than lost quota: OpenRouteService permits **one single
  account per person**, so the stolen key is the victim's only key, and
  repeatedly exceeding limits "may result in temporary blocking of your
  access", meaning an abuser can get the victim's account blocked. The primary
  control in this ADR simply does not exist for this provider.
- **Follow-ups:**
  - Decide and record Mapbox as the provider for any public BYOK deploy, given
    the above. OpenRouteService remains fine for local or single-operator use,
    where the key is not handed to strangers.
  - Verify the CSP against a real `npm run build`. Vite may emit an inline
    module-preload script, which `script-src 'self'` would block; resolve with
    a hash or by disabling `build.modulePreload`.
  - Decide whether the CSP ships as a `<meta http-equiv>` in `index.html`
    (portable across static hosts) or as a response header (preferable where
    the host allows it).
  - Scrub the key from any future error-reporting integration: the Mapbox
    request carries it in the query string
    (`src/shared/routing/mapboxDirectionsProvider.ts:26`), so a naive
    integration would capture it.
  - Update `docs/ARCHITECTURE.md` §Constraints to distinguish the providers.

## Links

- [ADR 0001](0001-user-supplied-routing-api-key-in-browser-storage.md) — the
  decision that creates this exposure.
- `docs/ARCHITECTURE.md` §Constraints — the current, provider-agnostic wording.
- [Mapbox access tokens](https://docs.mapbox.com/api/accounts/tokens/) —
  `pk.`/`sk.` token types and the `allowedUrls` restriction.
- [OpenRouteService terms of service](https://openrouteservice.org/terms-of-service)
  — one account per person, blocking on repeated limit abuse.
