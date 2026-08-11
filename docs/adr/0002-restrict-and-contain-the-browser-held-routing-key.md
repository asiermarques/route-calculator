---
title: Restrict and contain the browser-held routing key
status: Accepted
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
messages — the current provider and geocoding errors report only which
service failed and how, never the key or the full request URL that carries
it, and `CLAUDE.md` §Prohibited patterns now states this as an invariant
rather than a property of the current code. The credentials screen's input
masks the key as it is typed. Storage does not enter into it at all:
requisite 002 decided to persist nothing — not `localStorage`, not
`sessionStorage` — so the key lives only in memory for the tab's session and
a reload asks for it again; there is consequently no "remember me" and no
"forget key" action to design, only the absence of storage this decision
originally weighed `localStorage` against.

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
  on the origin holding the visitor's credential. This is now recorded in
  `CLAUDE.md` §Prohibited patterns, not only here. `docs/ARCHITECTURE.md`
  §Constraints, which used to treat the two routing providers as equivalent
  ("Keys must be restricted by HTTP referrer/domain"), has been corrected to
  distinguish them, as recorded below.
- **Accepted residual risks.** Two vectors execute inside the page's own
  context and are not mitigable by a static app with no backend: a malicious
  browser extension the visitor has installed, which can read page memory and
  is not something a website's own CSP or code can defend against; and a
  supply-chain compromise of one of the four runtime dependencies, which would
  ship as first-party code and inherit whatever `connect-src` already allows.
  Both are accepted rather than left implied, so neither the CSP nor the
  provider restriction should be read as a stronger guarantee than they are.
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
- **Shipped by this decision's implementation** (`003-routing-key-exposure-hardening`):
  the CSP verified against a real `npm run build` — Vite's module-preload
  polyfill did trip `script-src 'self'` as anticipated, resolved by disabling
  `build.modulePreload` rather than relaxing the policy
  (`vite.config.ts`); the CSP shipped as a `<meta http-equiv>` in the built
  `index.html` only, per ASM-001 (`src/shared/net/contentSecurityPolicy.ts`);
  the credentials screen now states OpenRouteService's warning and Mapbox's
  restriction steps concretely, replacing the generic "if it offers that"
  sentence requisite 002's credentials screen shipped; and
  `docs/ARCHITECTURE.md` §Constraints now distinguishes the two providers and
  records the CSP.
- **Still open:** deciding and recording which provider a public deploy should
  recommend (OpenRouteService remains fine for local or single-operator use,
  where the key is not handed to strangers) — a product decision, left to
  whoever ships a public deploy rather than invented here. Scrubbing the key
  from a future error-reporting integration remains relevant guidance for
  whenever one is added; `CLAUDE.md` §Prohibited patterns now states the
  invariant it would have to honour.

## Links

- [ADR 0001](0001-user-supplied-routing-api-key-in-browser-storage.md) — the
  decision that creates this exposure.
- `docs/ARCHITECTURE.md` §Constraints — distinguishes the two providers and
  records the Content-Security-Policy this decision resulted in.
- [Mapbox access tokens](https://docs.mapbox.com/api/accounts/tokens/) —
  `pk.`/`sk.` token types and the `allowedUrls` restriction.
- [OpenRouteService terms of service](https://openrouteservice.org/terms-of-service)
  — one account per person, blocking on repeated limit abuse.
