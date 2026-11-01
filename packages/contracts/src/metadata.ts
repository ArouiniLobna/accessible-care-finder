import { Type, type Static } from '@sinclair/typebox';

export const HealthResponseSchema = Type.Object(
  {
    status: Type.Union([Type.Literal('ok'), Type.Literal('degraded')]),
    database: Type.Union([Type.Literal('ok'), Type.Literal('unavailable')]),
  },
  { title: 'HealthResponse', additionalProperties: false },
);
export type HealthResponse = Static<typeof HealthResponseSchema>;
