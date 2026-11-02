import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { SearchWorkersRequest, SearchWorkersResponse } from '@acf/contracts';
import { buildApp } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { createDatabase, type DatabaseHandle } from '../../src/db/client';
import { DEMO_SUPPORT_REQUEST_ID, resetDemoData } from '../../src/db/seed';

export function testDatabaseUrl(): string {
  const url = process.env['TEST_DATABASE_URL'];
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Start Postgres (docker compose up -d) and copy .env.example to .env.',
    );
  }
  if (!/test/i.test(url)) {
    // The suite truncates tables. Refuse anything that does not look like a test database.
    throw new Error('TEST_DATABASE_URL must point at a database whose name contains "test".');
  }
  return url;
}

export interface Harness {
  app: FastifyInstance;
  database: DatabaseHandle;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

export async function createHarness(overrides: Record<string, string> = {}): Promise<Harness> {
  const url = testDatabaseUrl();
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: url,
    ENABLE_DEMO_CONTROLS: 'true',
    ENABLE_API_DOCS: 'true',
    DATABASE_POOL_MAX: '5',
    LOG_LEVEL: 'silent',
    ...overrides,
  });
  // Pin the session date so assertions never depend on today's date.
  process.env['DEMO_SESSION_DATE'] = '2026-11-07';
  const database = createDatabase(url, config.databasePoolMax);
  const app = await buildApp({ config, db: database.db });
  await app.ready();
  return {
    app,
    database,
    reset: async () => {
      await resetDemoData(database.db);
    },
    close: async () => {
      await app.close();
      await database.close();
    },
  };
}

export const idempotencyKey = () => `test-${randomUUID()}`;

export function searchBody(overrides: Partial<SearchWorkersRequest> = {}): SearchWorkersRequest {
  return {
    supportRequestId: DEMO_SUPPORT_REQUEST_ID,
    radiusKm: 10,
    requiredServiceIds: ['personal-care', 'meal-preparation'],
    languageCodes: [],
    sort: 'recommended',
    cursor: null,
    limit: 12,
    ...overrides,
  };
}

export async function search(app: FastifyInstance, overrides: Partial<SearchWorkersRequest> = {}) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/workers/search',
    payload: searchBody(overrides),
  });
  return { response, body: response.json<SearchWorkersResponse>() };
}

/** Follow nextCursor until exhausted, returning every worker id in order. */
export async function searchAllPages(
  app: FastifyInstance,
  overrides: Partial<SearchWorkersRequest> = {},
): Promise<{
  ids: string[];
  resultCount: number;
  pages: number;
  items: SearchWorkersResponse['items'];
}> {
  let cursor: string | null = null;
  const items: SearchWorkersResponse['items'] = [];
  let resultCount = 0;
  let pages = 0;
  do {
    const { response, body } = await search(app, { ...overrides, cursor });
    if (response.statusCode !== 200) throw new Error(`search failed: ${response.body}`);
    items.push(...body.items);
    resultCount = body.meta.resultCount;
    cursor = body.nextCursor;
    pages += 1;
    if (pages > 50) throw new Error('pagination did not terminate');
  } while (cursor);
  return { ids: items.map((item) => item.id), resultCount, pages, items };
}
