// @vitest-environment node
/// <reference types="node" />
import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A distinctive value, unlikely to appear in the bundle for any reason other
// than the leak this test exists to catch.
const SECRET_KEY = 'routes-e2e-secret-9f3a2b7c-do-not-leak'
const VITE_BIN = join(process.cwd(), 'node_modules', '.bin', 'vite')

function allFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? allFiles(path) : [path]
  })
}

describe('production bundle', () => {
  let outDir: string | undefined

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true })
  })

  it(
    'never embeds VITE_ROUTING_API_KEY, even when it is set at build time (BR-002, US-002 AC3)',
    () => {
      outDir = mkdtempSync(join(tmpdir(), 'routes-bundle-check-'))

      // A real `vite build` in a fresh child process, not the `vite`
      // JS API called in-process — this process already runs under
      // vitest's own "test" mode, which would leave `import.meta.env.DEV`
      // true and defeat the very guard this test exists to check.
      execFileSync(VITE_BIN, ['build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'silent'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          VITE_ROUTING_PROVIDER: 'openrouteservice',
          VITE_ROUTING_API_KEY: SECRET_KEY,
        },
        stdio: 'pipe',
      })

      for (const file of allFiles(outDir)) {
        expect(readFileSync(file, 'utf-8')).not.toContain(SECRET_KEY)
      }
    },
    30_000,
  )
})
