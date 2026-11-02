import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiTarget = process.env['VITE_API_PROXY_TARGET'] ?? 'http://127.0.0.1:3001';

// The browser talks to its own origin; Vite forwards /api to Fastify. That keeps cookies,
// CORS and the SSE stream simple in development, and mirrors a same-origin production setup
// behind a reverse proxy.
const proxy = {
  '/api': { target: apiTarget, changeOrigin: false },
  '/health': { target: apiTarget },
};

export default defineConfig({
  plugins: [react()],
  envDir: '../..',
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
  build: { sourcemap: true, target: 'es2022' },
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
