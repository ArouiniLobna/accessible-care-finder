import { buildApp } from './app';
import { loadConfig } from './config/env';
import { createDatabase } from './db/client';

const config = loadConfig();
const database = createDatabase(config.databaseUrl, config.databasePoolMax);
const app = await buildApp({ config, db: database.db });

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    await database.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'error during shutdown');
    process.exit(1);
  }
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error({ err: error }, 'failed to start');
  await database.close();
  process.exit(1);
}
