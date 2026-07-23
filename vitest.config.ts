import { defineConfig } from 'vitest/config'
import path from 'path'

// Unit tests run in a plain Node environment — the suite targets pure logic
// modules (crypto, tokens, sanitisation, formatting), no React/DOM or DB.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
