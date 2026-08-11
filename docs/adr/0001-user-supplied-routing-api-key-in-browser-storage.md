---
title: User-supplied routing API key in browser storage
status: Proposed
date: 2026-08-11
tags: [security, frontend, technology-choice]
deciders: [Asier Marqués]
---

# 0001. User-supplied routing API key in browser storage

## Context and problem statement

Today the routing provider API key is build-time configuration: `.env.example`
declares `VITE_ROUTING_API_KEY`, and `createRoutingProvider`
(`src/shared/routing/config.ts:26-44`) reads it from `import.meta.env` and
hands it to the selected provider. The key therefore ships inside the client
bundle.

That is adequate while the app runs locally for one person, which is the
audience `docs/PRODUCT.md` describes. It stops being adequate the moment the
app is deployed to a public URL that other people load: every visitor's
routing request would consume the operator's provider quota, on the operator's
key.

The question is where the routing API key should come from once the app is
publicly deployed, and — because the answer keeps pulling towards it — whether
the app should acquire a backend to hold it.

## Decision drivers

- **Cost-effectiveness.** `docs/ARCHITECTURE.md` §Shape makes the build a set
  of static files deployable to any static host. Introducing a server trades
  that for hosting, deployment and uptime concerns, for a PoC.
- **Security.** Holding other people's provider credentials means encryption
  at rest, key management for that encryption key, and incident response if
  the store leaks. `docs/ARCHITECTURE.md` §Constraints already requires the
  operator's own key to stay within a capped free tier; that requirement
  cannot be enforced on a credential supplied by someone else.
- **Product.** "User accounts, login, or any server-side user data" is the
  first explicit non-goal in `docs/PRODUCT.md`, which states that reopening a
  non-goal is a product decision rather than an implementation detail.
- **Maintainability.** One screen, one job (`docs/PRODUCT.md` §Product
  principles). Auth flows, a database and migrations are a large permanent
  increase in moving parts.

## Considered options

1. **Keep the build-time key in the bundle** — status quo; the operator's key
   serves every visitor.
2. **Pass the key as a URL query parameter** — the visitor appends their key
   to the app URL.
3. **Visitor-supplied key stored in `localStorage`** — a settings panel takes
   the key once and persists it in the browser.
4. **Backend with accounts, per-user keys in a database, routing calls proxied
   server-side** — each visitor registers and stores their own key.
5. **Backend proxying routing calls with a single operator key plus rate
   limiting** — no per-user keys; abuse is capped instead.

## Decision outcome

Chosen option: **"Visitor-supplied key stored in `localStorage`"**, because the
key belongs to the visitor, and a credential held in its own owner's browser
is not exposed to anyone who could not already obtain it. Every server-side
alternative adds infrastructure and credential custody without reducing that
exposure.

The reasoning that settles it: `localStorage` is scoped per origin and per
browser, so one visitor's key is never readable by another visitor, and never
reaches the operator at all. Moving those same keys into a database does not
close any path that was open — it converts a dispersed, individual risk (an
XSS compromises whoever is currently on the page) into a centralised one (a
database breach yields every stored key at once), and adds the operator as a
custodian of third-party credentials.

Options rejected, with the reasons worth remembering:

- **Option 1** leaves the operator paying for every visitor's routing, which is
  the problem being solved.
- **Option 2** is strictly worse than the status quo: keys in URLs reach
  browser history, server and CDN access logs, and `Referer` headers sent to
  the tile, geocoding and routing hosts, and they travel whenever the link is
  shared. It also defeats the referrer-restriction mitigation that
  `docs/ARCHITECTURE.md` §Constraints depends on.
- **Option 4** works, and an earlier round of this discussion dismissed it for
  a wrong reason. A backend that merely *stores* the key must send it back to
  the browser to be used, leaving exposure unchanged; but a backend that also
  *makes the routing call* does keep the key off the client entirely. The
  correct objection is not that it fails, it is that it pays a permanent cost
  — accounts, database, encryption at rest, loss of static hosting — to hide a
  secret from the only party it already belongs to. Note also that accounts
  are separable from per-user keys: an opaque identifier in `localStorage`
  mapped to a stored key achieves the same without registration, passwords or
  email.
- **Option 5** solves a different problem. It hides the operator's key, but the
  operator still pays for all usage, merely capped. It becomes the right answer
  if the goal changes from "visitors bring their own quota" to "visitors should
  not need to know what an API key is".

### Consequences

- **Good:** routing quota is per visitor. The build stays a set of static files
  on any static host. The operator holds no third-party credentials and carries
  no matching breach liability, which is also a claim worth surfacing in the
  UI. The `docs/PRODUCT.md` no-accounts non-goal stays intact.
- **Trade-offs:** this is the first persisted state the app has ever had, and
  `docs/ARCHITECTURE.md` §State currently states that nothing is persisted —
  no localStorage, no cookies, no server storage. The exception is deliberate
  and narrow: it covers *configuration*, not route data, so the ephemeral-route
  product decision that the section actually derives from is unaffected. That
  section needs rewording rather than silent contradiction. Visitors must
  obtain their own provider key, which is real friction and rules out a
  general audience. The key does not follow a visitor across devices or
  survive clearing browser data.
- **Follow-ups:**
  - Decide whether `VITE_ROUTING_API_KEY` survives as an optional default —
    used until a visitor supplies their own — so local development keeps
    working with no setup. Recommended, not yet decided.
  - Decide whether provider selection stays build-time
    (`VITE_ROUTING_PROVIDER`). Keeping it build-time is simpler, but in a
    public deploy the key a visitor brings determines which provider can serve
    it, which argues for moving the choice to runtime alongside the key. Open.
  - The residual exposure of a key held in the browser is addressed separately
    in ADR 0002.
  - `docs/ARCHITECTURE.md` §State and §Shape need updating once this is
    implemented.

## Links

- [ADR 0002](0002-restrict-and-contain-the-browser-held-routing-key.md) — the
  hardening this decision makes necessary.
- `docs/PRODUCT.md` §Explicit non-goals — accounts and server-side user data.
- `docs/ARCHITECTURE.md` §Shape, §State, §Constraints.
- `src/shared/routing/config.ts` — the current build-time configuration.
