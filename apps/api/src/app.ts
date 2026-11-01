import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config/env';
import type { Database } from './db/client';
import { healthRoutes } from './modules/health/health.routes';
import { createMetadataRepository } from './modules/metadata/metadata.repository';
import { metadataRoutes } from './modules/metadata/metadata.routes';
import { createSupportRequestRepository } from './modules/support-requests/support-request.repository';
import { supportRequestRoutes } from './modules/support-requests/support-request.routes';
import { createSupportRequestService } from './modules/support-requests/support-request.service';
import { registerErrorHandling } from './plugins/error-handler';
import { registerOpenApi } from './plugins/openapi';
import { genReqId, registerRequestLogging } from './plugins/request-logging';

export interface AppDependencies {
  config: AppConfig;
  db: Database;
}

/**
 * Composition root. Plain factory functions wire repositories → services → routes; there is
 * no DI container because there is nothing a container would add at this size.
 * Building the app is separate from starting it (server.ts), so tests can use app.inject().
 */
export async function buildApp({ config, db }: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      ...(config.nodeEnv === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
          }
        : {}),
    },
    genReqId,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: true,
    bodyLimit: 16 * 1024,
    trustProxy: config.nodeEnv === 'production',
  }).withTypeProvider<TypeBoxTypeProvider>();

  // ---- Cross-cutting concerns (registered before routes so their hooks apply everywhere)
  registerRequestLogging(app);
  registerErrorHandling(app);

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
  });
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['content-type', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  });
  if (config.enableApiDocs) await registerOpenApi(app);

  // ---- Wiring
  const metadata = createMetadataRepository(db);
  const supportRequests = createSupportRequestService(createSupportRequestRepository(db));

  // ---- Routes
  await app.register(healthRoutes, { db });
  await app.register(metadataRoutes, { prefix: '/api/metadata', metadata });
  await app.register(supportRequestRoutes, { prefix: '/api/support-requests', supportRequests });

  return app;
}
