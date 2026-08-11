---
title: User-supplied routing API key, held in memory only
status: Accepted
date: 2026-08-11
tags: [security, frontend, technology-choice]
deciders: [Asier Marqués]
---

# 0001. User-supplied routing API key, held in memory only

> **Revision note (2026-08-11):** this ADR originally proposed storing the
> visitor's key in `localStorage`. `.workflow/requisites/002-visitor-routing-key-entry.md`
> revisited that during its interview and reversed it: the key is held in
> React state only, for the lifetime of the page, and is never written to any
> browser store. The title, decision outcome and consequences below reflect
> that reversal; the problem statement, drivers and the case against a
> backend are unchanged and are why this ADR still exists rather than being
> replaced outright. See `.workflow/tasks/002-visitor-routing-key-entry/US-001.md`
> for the implementation this now matches.

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
3. **Visitor-supplied key, held in memory only for the lifetime of the page**
   — a credentials screen takes the provider and key once per load; nothing
   is written to any browser store, so a reload asks again.
4. **Visitor-supplied key stored in `localStorage`** — a settings panel takes
   the key once and persists it in the browser, surviving reloads.
5. **Backend with accounts, per-user keys in a database, routing calls proxied
   server-side** — each visitor registers and stores their own key.
6. **Backend proxying routing calls with a single operator key plus rate
   limiting** — no per-user keys; abuse is capped instead.

## Decision outcome

Chosen option: **"Visitor-supplied key, held in memory only"**, because the
key belongs to the visitor, and a credential held only in its own owner's
browser tab is not exposed to anyone who could not already obtain it — every
server-side alternative adds infrastructure and credential custody without
reducing that exposure, and persisting it client-side buys back convenience
at a cost this project has already decided against paying.

The reasoning that settles it: a key that exists only in React state for the
lifetime of the page is never readable by another visitor and never reaches
the operator, exactly as a `localStorage`-backed key would be — but it also
adds nothing to attack. There is no stored value to read after the tab
closes, no store to scope correctly, and no "forget me" control to build and
then trust. `CLAUDE.md` §Prohibited patterns already states "No
transactions/persistence of any kind — this app has none, by design"; holding
the credential in memory keeps that invariant exactly, rather than carving out
an exception for it. Moving the same key into a database does not close any
path that was open either — it converts a dispersed, individual risk (an XSS
compromises whoever is currently on the page) into a centralised one (a
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
- **Option 4** (`localStorage`) was this ADR's original decision, and was
  reversed during the requisites interview for 002. It reads as the more
  convenient choice — no re-entry on reload — but it is the first persisted
  state this app would ever have, directly contradicting the no-persistence
  rule in `CLAUDE.md` and `docs/ARCHITECTURE.md` §State rather than merely
  sitting outside their current scope. It also does not change the exposure
  ADR 0002 addresses: the key still sits in clear text, reachable by any script
  running on the page, for as long as it is kept. The friction of re-entering
  a key every load (RISK-001 in the requisites) was judged the smaller cost.
- **Option 5** works, and an earlier round of this discussion dismissed it for
  a wrong reason. A backend that merely *stores* the key must send it back to
  the browser to be used, leaving exposure unchanged; but a backend that also
  *makes the routing call* does keep the key off the client entirely. The
  correct objection is not that it fails, it is that it pays a permanent cost
  — accounts, database, encryption at rest, loss of static hosting — to hide a
  secret from the only party it already belongs to.
- **Option 6** solves a different problem. It hides the operator's key, but the
  operator still pays for all usage, merely capped. It becomes the right answer
  if the goal changes from "visitors bring their own quota" to "visitors should
  not need to know what an API key is".

### Consequences

- **Good:** routing quota is per visitor. The build stays a set of static files
  on any static host. The operator holds no third-party credentials and carries
  no matching breach liability, which is also a claim worth surfacing in the
  UI. The `docs/PRODUCT.md` no-accounts non-goal stays intact, and so does the
  project's blanket no-persistence rule — this is state the app holds, not
  state it stores.
- **Trade-offs:** visitors must obtain their own provider key, which is real
  friction and rules out a general audience (RISK-001). Because nothing is
  persisted, that friction repeats on every reload, every new tab and every
  device — the key never follows a visitor anywhere. `docs/PRODUCT.md`'s "no
  account, no friction, usable the moment it loads" principle no longer holds
  for a production build, and needs rewording rather than silent
  contradiction; `.workflow/requisites/002-visitor-routing-key-entry.md`
  records that this supersedes GOAL-002 of requisite 001 for production
  builds only — development, seeded from `.env`, keeps the old experience.
- **Follow-ups:**
  - `VITE_ROUTING_API_KEY` survives as a development-only seed — read in
    `npm run dev`, absent from any production bundle regardless of whether the
    variable is set at build time. Resolved by US-002.
  - Provider selection moves to runtime, alongside the key, since the key a
    visitor brings determines which provider can serve it. Resolved by
    US-001/US-003.
  - The residual exposure of a key held in the browser while the tab is open
    is addressed separately in ADR 0002.
  - `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` §Shape/§State/§Constraints and
    `CLAUDE.md` §Configuration are updated as part of this decision landing,
    not left to a follow-up — see the Links below.

## Links

- [ADR 0002](0002-restrict-and-contain-the-browser-held-routing-key.md) — the
  hardening this decision makes necessary.
- `.workflow/requisites/002-visitor-routing-key-entry.md` — the interview that
  reversed the original `localStorage` decision.
- `docs/PRODUCT.md` §Explicit non-goals, §Product principles.
- `docs/ARCHITECTURE.md` §Shape, §State, §Constraints.
- `CLAUDE.md` §Prohibited patterns, §Configuration.
- `src/credentials/` — the runtime credential state (`useCredentials`) and the
  credentials screen this decision implements.
