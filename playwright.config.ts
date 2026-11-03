import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run the real stack: Fastify API + Postgres + the production web build
 * served by `vite preview` (which proxies /api, like a same-origin deployment).
 *
 * DATABASE_URL must point at a migrated database. Tests reset the demo scenario through the
 * demo API before each test, so do not point this at data you care about.
 */
const databaseUrl =
  process.env['DATABASE_URL'] ?? 'postgres://care:care@localhost:5432/care_finder';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // one shared demo scenario
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @acf/api db:migrate && pnpm --filter @acf/api exec tsx src/server.ts',
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: databaseUrl,
        API_PORT: '3001',
        LOG_LEVEL: 'warn',
        ENABLE_DEMO_CONTROLS: 'true',
        CORS_ORIGINS: 'http://localhost:4173',
        SSE_HEARTBEAT_MS: '5000',
        DEMO_SESSION_DATE: '2026-11-07',
      },
    },
    {
      command: 'pnpm --filter @acf/web build && pnpm --filter @acf/web preview',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      env: { VITE_ENABLE_DEMO_CONTROLS: 'true', VITE_API_BASE_URL: '' },
    },
  ],
});
