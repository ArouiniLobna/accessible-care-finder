import { defineConfig } from 'drizzle-kit';

/**
 * `pnpm db:generate` diffs src/db/schema.ts against the last snapshot and writes a new SQL
 * migration into ./drizzle. Always read generated SQL before committing it.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      (
        globalThis as typeof globalThis & {
          process: { env: Record<string, string | undefined> };
        }
      ).process.env['DATABASE_URL'] ?? 'postgres://care:care@localhost:5432/care_finder',
  },
  strict: true,
});
