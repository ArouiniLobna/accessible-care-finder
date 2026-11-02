/**
 * Typed, validated environment configuration. The process fails fast on invalid config
 * instead of discovering a typo at the first request.
 */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  databaseUrl: string;
  databasePoolMax: number;
  corsOrigins: string[];
  enableApiDocs: boolean;
  enableDemoControls: boolean;
  demoLatency: { minMs: number; maxMs: number };
  sseHeartbeatMs: number;
}

type Env = Record<string, string | undefined>;

class ConfigError extends Error {}

function readEnum<T extends string>(env: Env, key: string, allowed: readonly T[], fallback: T): T {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const match = allowed.find((value) => value === raw);
  if (match === undefined) {
    throw new ConfigError(`${key} must be one of ${allowed.join(', ')}`);
  }
  return match;
}

function readBool(env: Env, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new ConfigError(`${key} must be true or false`);
}

function readInt(env: Env, key: string, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${key} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function loadConfig(env: Env = process.env): AppConfig {
  const nodeEnv = readEnum(env, 'NODE_ENV', ['development', 'test', 'production'], 'development');
  const isProduction = nodeEnv === 'production';

  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) throw new ConfigError('DATABASE_URL is required');

  const minMs = readInt(env, 'DEMO_LATENCY_MIN_MS', 0, 0, 10_000);
  const maxMs = readInt(env, 'DEMO_LATENCY_MAX_MS', 0, 0, 10_000);
  if (maxMs < minMs) throw new ConfigError('DEMO_LATENCY_MAX_MS must be >= DEMO_LATENCY_MIN_MS');

  return {
    nodeEnv,
    host: env['API_HOST'] || '127.0.0.1',
    port: readInt(env, 'API_PORT', 3001, 0, 65_535),
    logLevel: readEnum(
      env,
      'LOG_LEVEL',
      ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      nodeEnv === 'test' ? 'silent' : 'info',
    ),
    databaseUrl,
    databasePoolMax: readInt(env, 'DATABASE_POOL_MAX', 10, 1, 100),
    corsOrigins: (env['CORS_ORIGINS'] ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    // Interactive docs are never enabled in production, whatever the variable says.
    enableApiDocs: !isProduction && readBool(env, 'ENABLE_API_DOCS', true),
    enableDemoControls: readBool(env, 'ENABLE_DEMO_CONTROLS', false),
    // Artificial latency is never enabled in production.
    demoLatency: isProduction ? { minMs: 0, maxMs: 0 } : { minMs, maxMs },
    sseHeartbeatMs: readInt(env, 'SSE_HEARTBEAT_MS', 15_000, 1_000, 120_000),
  };
}
