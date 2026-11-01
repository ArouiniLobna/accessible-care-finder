import type { FastifyError, FastifyInstance } from 'fastify';
import { ApiErrorSchema, type ApiError } from '@acf/contracts';
import { AppError } from '../shared/errors';

/** Response-schema entries for the listed error statuses, for route definitions. */
export function errorResponses<const S extends number>(...statuses: S[]) {
  return Object.fromEntries(statuses.map((status) => [status, ApiErrorSchema])) as Record<
    S,
    typeof ApiErrorSchema
  >;
}

interface ValidationIssue {
  instancePath?: string;
  message?: string;
  params?: Record<string, unknown>;
}

/** Turn validation issues into `{ "params.id": "must match pattern …" }`. */
function toFieldErrors(issues: readonly ValidationIssue[], context: string | undefined) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const missing = issue.params?.['missingProperty'];
    const path = [
      context,
      ...(issue.instancePath ?? '').split('/').filter(Boolean),
      ...(typeof missing === 'string' ? [missing] : []),
    ]
      .filter(Boolean)
      .join('.');
    const key = path || 'request';
    fieldErrors[key] ??=
      typeof missing === 'string' ? 'is required' : (issue.message ?? 'is invalid');
  }
  return fieldErrors;
}

/**
 * One public error envelope for everything: { code, message, requestId, fieldErrors? }.
 * Stack traces, SQL and driver messages are logged server-side, never sent to the browser.
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    let status: number;
    let body: ApiError;

    if (error instanceof AppError) {
      status = error.statusCode;
      body = {
        code: error.code,
        message: error.message,
        requestId: request.id,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      };
      request.log.info({ code: error.code, statusCode: status }, 'request rejected');
    } else if (error.validation) {
      status = 400;
      body = {
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields.',
        requestId: request.id,
        fieldErrors: toFieldErrors(error.validation, error.validationContext),
      };
      request.log.info({ code: body.code, fieldErrors: body.fieldErrors }, 'validation failed');
    } else if (
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      // Fastify's own client errors: malformed JSON, body too large, unsupported media type…
      status = error.statusCode;
      body = {
        code: 'VALIDATION_ERROR',
        message: status === 413 ? 'That request was too large.' : "We couldn't read that request.",
        requestId: request.id,
      };
      request.log.info({ code: error.code, statusCode: status }, 'client error');
    } else {
      status = 500;
      body = {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again.',
        requestId: request.id,
      };
      request.log.error({ err: error }, 'unhandled error');
    }

    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      code: 'NOT_FOUND',
      message: "We couldn't find that.",
      requestId: request.id,
    } satisfies ApiError),
  );
}
