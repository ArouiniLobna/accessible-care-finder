import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { sql } from 'drizzle-orm';
import { HealthResponseSchema } from '@acf/contracts';
import type { Database } from '../../db/client';

/** Liveness + database reachability. Reveals nothing about versions, hosts or configuration. */
export const healthRoutes: FastifyPluginAsyncTypebox<{ db: Database }> = async (app, { db }) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Health check',
        response: { 200: HealthResponseSchema, 503: HealthResponseSchema },
      },
      // Health probes would otherwise dominate the logs.
      logLevel: 'warn',
    },
    async (request, reply) => {
      try {
        await db.execute(sql`SELECT 1`);
        return { status: 'ok' as const, database: 'ok' as const };
      } catch (error) {
        request.log.error({ err: error }, 'health check: database unreachable');
        return reply.status(503).send({ status: 'degraded', database: 'unavailable' });
      }
    },
  );
};
