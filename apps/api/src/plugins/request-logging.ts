import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import { REQUEST_ID_HEADER } from '@acf/contracts/constants';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Honour a well-formed incoming X-Request-Id (e.g. from a load balancer) so a request can be
 * traced across hops; otherwise mint one. Untrusted values are never echoed into logs.
 */
export const genReqId: NonNullable<FastifyServerOptions['genReqId']> = (req) => {
  const incoming = req.headers[REQUEST_ID_HEADER];
  return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
};

/**
 * One structured line per request: requestId, method, route, statusCode, durationMs.
 * `route` is the route *pattern* (/api/support-requests/:id), which keeps log cardinality low
 * and avoids writing identifiers from the URL. Bodies are never logged.
 */
export function registerRequestLogging(app: FastifyInstance): void {
  app.addHook('onRequest', async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });

  app.addHook('onResponse', async (request, reply) => {
    const entry = {
      method: request.method,
      route: request.routeOptions.url ?? 'unmatched',
      statusCode: reply.statusCode,
      durationMs: Math.round(reply.elapsedTime),
    };
    if (reply.statusCode >= 500) request.log.error(entry, 'request completed');
    else request.log.info(entry, 'request completed');
  });
}
