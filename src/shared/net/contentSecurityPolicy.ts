// Extension included (unlike the rest of `src`, `tsconfig.app.json`'s
// bundler resolution): `vite.config.ts` imports this module too, under
// `tsconfig.node.json`'s `nodenext` resolution, which requires it.
import { OUTBOUND_ORIGINS } from './outboundOrigins.ts'

/** Builds the production Content-Security-Policy (US-001): `connect-src`
 * permits exactly the app's own origin and the four declared
 * `OUTBOUND_ORIGINS` (US-002) — nothing else — so a script running on this
 * origin cannot exfiltrate a visitor's routing key anywhere but the services
 * the app itself already needs.
 *
 * Injected into the built `index.html` only, by a build-only Vite plugin
 * (`vite.config.ts`) — `npm run dev` needs Vite's own inline scripts and HMR
 * websocket, which this policy would block. */
export function buildContentSecurityPolicy(): string {
  const directives: [string, string[]][] = [
    ['default-src', ["'none'"]],
    ['connect-src', ["'self'", ...OUTBOUND_ORIGINS]],
    // `data:` (EDGE-001): Leaflet loads a 1x1 transparent GIF data URI for
    // its own internal retina-detection probe, observed against a real
    // build rather than assumed.
    ['img-src', ["'self'", 'data:', ...OUTBOUND_ORIGINS.filter((origin: string) => origin.includes('tile'))]],
    // No 'unsafe-inline' (RISK-001) — a build that needs it is a build
    // configuration to fix (e.g. Vite's modulePreload polyfill, disabled in
    // vite.config.ts), never a reason to relax this.
    ['script-src', ["'self'"]],
    ['style-src', ["'self'"]],
    // The app's two typefaces are served from this origin (`public/fonts/`,
    // `src/shared/design/fonts.css`). A font CDN would mean a third-party
    // origin listed here, on a page that handles a visitor's routing key —
    // which is exactly what CLAUDE.md's no-third-party rule forbids. Under
    // `default-src 'none'` this directive is not optional: without it the
    // browser blocks the app's own fonts.
    ['font-src', ["'self'"]],
    ['base-uri', ["'self'"]],
    ['object-src', ["'none'"]],
    ['form-action', ["'none'"]],
    ['frame-ancestors', ["'none'"]],
  ]

  return directives.map(([directive, sources]) => `${directive} ${sources.join(' ')}`).join('; ')
}
