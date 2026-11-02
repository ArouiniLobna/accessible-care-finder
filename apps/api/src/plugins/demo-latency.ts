import type { FastifyInstance } from 'fastify';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * DEVELOPMENT ONLY. Local APIs answer in ~2 ms, which hides loading, refreshing and
 * cancellation behaviour. This single hook adds a random delay to /api/* requests when
 * DEMO_LATENCY_MAX_MS > 0. loadConfig() forces it off when NODE_ENV=production.
 * The SSE stream is excluded: delaying it would only delay the connection.
 */
export function registerDemoLatency(
  app: FastifyInstance,
  latency: { minMs: number; maxMs: number },
) {
  if (latency.maxMs <= 0) return;
  app.log.warn(latency, 'artificial API latency enabled (development only)');

  app.addHook('onRequest', async (request) => {
    const route = request.routeOptions.url ?? '';
    if (!route.startsWith('/api/') || route.startsWith('/api/events/')) return;
    const delay = latency.minMs + Math.random() * (latency.maxMs - latency.minMs);
    await sleep(delay);
  });
}
