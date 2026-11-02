import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Load the repository-root .env for local runs. Real environment variables (CI) win.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
for (const [key, value] of Object.entries(loadEnv('test', repoRoot, ''))) {
  process.env[key] ??= value;
}

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['test/integration/global-setup.ts'],
          // One shared test database: run files serially so resets don't interleave.
          fileParallelism: false,
          testTimeout: 15_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
