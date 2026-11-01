import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config/env';
import type { Database } from './db/client';
import { healthRoutes } from './modules/health/health.routes';

export interface AppDependencies {
  config: AppConfig;
  db: Database;
}

/**
 * Composition root: create the Fastify instance and register every module.
 * Building the app is separate from starting it (server.ts), so tests can build an app
 * and send it requests without opening a network port.
 */
export async function buildApp({ config, db }: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      ...(config.nodeEnv === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
          }
        : {}),
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(healthRoutes, { db });

  return app;
}
