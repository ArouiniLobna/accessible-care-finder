import { Type, type Static } from '@sinclair/typebox';
import { API_ERROR_CODES } from './constants';

export const ApiErrorCodeSchema = Type.Union(
  API_ERROR_CODES.map((code) => Type.Literal(code)),
  { title: 'ApiErrorCode' },
);
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const ApiErrorSchema = Type.Object(
  {
    code: ApiErrorCodeSchema,
    message: Type.String({ description: 'Plain-language message safe to show to a person.' }),
    requestId: Type.String(),
    fieldErrors: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        description: 'Field path → problem description (validation errors only).',
      }),
    ),
  },
  { title: 'ApiError', additionalProperties: false },
);
export type ApiError = Static<typeof ApiErrorSchema>;
