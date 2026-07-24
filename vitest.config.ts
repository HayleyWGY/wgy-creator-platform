import { defineConfig } from 'vitest/config'
import path from 'path'

// Tests run in a plain Node environment — mostly pure logic modules (crypto,
// tokens, sanitisation, formatting), plus a handful of integration suites
// that talk to the real database.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Vitest runs teardown via a globalSetup file's named `teardown` export
    // (`globalTeardown` is Jest's option and is silently ignored here).
    globalSetup: ['tests/global-setup.ts'],
    // Run test FILES one at a time.
    //
    // Several suites hit the real Postgres, each opening its own pooled
    // client. In parallel they contend for connections and occasionally fail
    // in a way that has nothing to do with the code under test — a suite that
    // fails at random trains everyone to ignore it, and CI runs on every
    // push. The whole run is well under a minute, so serialising costs
    // little and buys a signal worth trusting.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
