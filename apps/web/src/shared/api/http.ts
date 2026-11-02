import type { ApiError, ApiErrorCode } from '@acf/contracts';
import { API_ERROR_CODES } from '@acf/contracts/constants';
import { config } from '../config';

/**
 * A failed API call, carrying the server's typed error when there was one.
 * `kind` separates "the server said no" from "we never reached the server".
 */
export class ApiRequestError extends Error {
  constructor(
    readonly kind: 'api' | 'network' | 'unexpected',
    readonly status: number,
    readonly code: ApiErrorCode | 'NETWORK_ERROR' | 'UNEXPECTED_RESPONSE',
    message: string,
    readonly requestId?: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['code'] === 'string' &&
    API_ERROR_CODES.some((code) => code === candidate['code']) &&
    typeof candidate['message'] === 'string' &&
    typeof candidate['requestId'] === 'string'
  );
}

export const isApiRequestError = (
  error: unknown,
  code?: ApiRequestError['code'],
): error is ApiRequestError =>
  error instanceof ApiRequestError && (code === undefined || error.code === code);

export const apiUrl = (path: string) => `${config.apiBaseUrl}${path}`;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal | undefined;
}

/**
 * The one HTTP helper: JSON in/out, AbortSignal pass-through (TanStack Query cancels
 * superseded searches with it), and typed errors. Response bodies are trusted only as far as
 * the shared contracts describe them; the API validates and serialises against the same schemas.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: options.method ?? 'GET',
      headers: {
        accept: 'application/json',
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...options.headers,
      },
      body: options.body === undefined ? null : JSON.stringify(options.body),
      signal: options.signal ?? null,
    });
  } catch (error) {
    // Let aborts propagate untouched: TanStack Query treats them as cancellation, not failure.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiRequestError('network', 0, 'NETWORK_ERROR', 'We could not reach the service.');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError(
      'unexpected',
      response.status,
      'UNEXPECTED_RESPONSE',
      'Unexpected response.',
    );
  }

  if (!response.ok) {
    if (isApiError(payload)) {
      throw new ApiRequestError(
        'api',
        response.status,
        payload.code,
        payload.message,
        payload.requestId,
        payload.fieldErrors,
      );
    }
    throw new ApiRequestError(
      'unexpected',
      response.status,
      'UNEXPECTED_RESPONSE',
      'Unexpected response.',
    );
  }
  return payload as T;
}
