import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { buildContentSecurityPolicy } from './src/shared/net/contentSecurityPolicy.ts'

// Injects the closed production Content-Security-Policy (US-001) into the
// built index.html only — `apply: 'build'` keeps `npm run dev` untouched,
// since Vite's dev server relies on inline scripts and an HMR websocket that
// this policy would block. `head-prepend` puts it before every other <head>
// element, including the favicon <link>, so nothing loads before the policy
// that governs it is in force.
function contentSecurityPolicyPlugin(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: buildContentSecurityPolicy() },
          injectTo: 'head-prepend' as const,
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contentSecurityPolicyPlugin()],
  build: {
    // Vite's module-preload polyfill is an inline <script>, which would
    // force 'unsafe-inline' into script-src to satisfy it (RISK-001). The
    // app's target browsers all support modulepreload natively, so the
    // polyfill is disabled rather than the policy relaxed.
    modulePreload: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    mockReset: true,
    exclude: ['node_modules', 'e2e', 'dist'],
  },
})
