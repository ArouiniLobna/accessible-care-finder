import type { ApiErrorCode } from '@acf/contracts';

/**
 * A failure the API expects and can describe safely to a person.
 * Anything that is not an AppError becomes a generic 500 with no internals exposed.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) =>
  new AppError(404, 'NOT_FOUND', `We couldn't find that ${what}.`);

export const validationError = (message: string, fieldErrors?: Record<string, string>) =>
  new AppError(400, 'VALIDATION_ERROR', message, fieldErrors);
