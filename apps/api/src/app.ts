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
import { createWorkerRepository } from './modules/workers/worker.repository';
import { workerRoutes } from './modules/workers/worker.routes';
import { createWorkerService } from './modules/workers/worker.service';
import { bookingRoutes } from './modules/bookings/booking.routes';
import { createBookingService } from './modules/bookings/booking.service';
import { AvailabilityEventHub } from './modules/availability/availability.events';
import { availabilityEventRoutes } from './modules/availability/availability.routes';
import { createAvailabilityNotifier } from './modules/availability/availability.service';
import demoRoutes from './modules/demo/demo.routes';
import { registerDemoLatency } from './plugins/demo-latency';

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
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["idempotency-key"]'],
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
    // Long-lived SSE sockets would otherwise keep app.close() waiting forever.
    forceCloseConnections: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // ---- Cross-cutting concerns (registered before routes so their hooks apply everywhere)
  registerRequestLogging(app);
  registerErrorHandling(app);
  registerDemoLatency(app, config.demoLatency);

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
  });
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['content-type', 'idempotency-key', 'x-request-id', 'last-event-id'],
    exposedHeaders: ['x-request-id', 'idempotent-replayed'],
  });
  if (config.enableApiDocs) await registerOpenApi(app);

  // ---- Wiring
  const hub = new AvailabilityEventHub({ heartbeatMs: config.sseHeartbeatMs });
  app.addHook('onClose', async () => hub.close());
  const notifier = createAvailabilityNotifier(hub);
  const metadata = createMetadataRepository(db);
  const supportRequestRepository = createSupportRequestRepository(db);
  const supportRequests = createSupportRequestService(supportRequestRepository);
  const workers = createWorkerService({
    workers: createWorkerRepository(db),
    supportRequests: supportRequestRepository,
    metadata,
  });
  const bookings = createBookingService({ db, notifier, log: app.log });
  if (config.enableDemoControls) {
    await app.register(demoRoutes, { db, notifier });
  }

  // ---- Routes
  await app.register(healthRoutes, { db });
  await app.register(metadataRoutes, { prefix: '/api/metadata', metadata });
  await app.register(supportRequestRoutes, { prefix: '/api/support-requests', supportRequests });
  await app.register(workerRoutes, { prefix: '/api/workers', workers });
  await app.register(bookingRoutes, { prefix: '/api', bookings });
  await app.register(availabilityEventRoutes, { prefix: '/api/events', hub });

  return app;
}
