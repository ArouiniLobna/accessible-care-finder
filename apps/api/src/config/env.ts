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

  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) throw new ConfigError('DATABASE_URL is required');

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
  };
}
