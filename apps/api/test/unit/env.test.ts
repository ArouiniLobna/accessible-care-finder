import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env';

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

describe('loadConfig', () => {
  it('requires DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it('defaults demo controls off', () => {
    expect(loadConfig(base).enableDemoControls).toBe(false);
  });

  it('never enables docs or artificial latency in production', () => {
    const config = loadConfig({
      ...base,
      NODE_ENV: 'production',
      ENABLE_API_DOCS: 'true',
      DEMO_LATENCY_MIN_MS: '200',
      DEMO_LATENCY_MAX_MS: '600',
    });
    expect(config.enableApiDocs).toBe(false);
    expect(config.demoLatency).toEqual({ minMs: 0, maxMs: 0 });
  });

  it('rejects invalid values instead of guessing', () => {
    expect(() => loadConfig({ ...base, API_PORT: 'eighty' })).toThrow(/API_PORT/);
    expect(() => loadConfig({ ...base, ENABLE_DEMO_CONTROLS: 'yes' })).toThrow(
      /ENABLE_DEMO_CONTROLS/,
    );
    expect(() =>
      loadConfig({ ...base, DEMO_LATENCY_MIN_MS: '500', DEMO_LATENCY_MAX_MS: '100' }),
    ).toThrow(/DEMO_LATENCY_MAX_MS/);
  });

  it('parses a comma-separated CORS allow-list', () => {
    expect(
      loadConfig({ ...base, CORS_ORIGINS: 'http://localhost:5173, http://127.0.0.1:4173' })
        .corsOrigins,
    ).toEqual(['http://localhost:5173', 'http://127.0.0.1:4173']);
  });
});
