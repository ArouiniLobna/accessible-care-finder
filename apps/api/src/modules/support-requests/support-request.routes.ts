import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { SupportRequestParamsSchema, SupportRequestSchema } from '@acf/contracts';
import { errorResponses } from '../../plugins/error-handler';
import type { SupportRequestService } from './support-request.service';

export const supportRequestRoutes: FastifyPluginAsyncTypebox<{
  supportRequests: SupportRequestService;
}> = async (app, { supportRequests }) => {
  app.get(
    '/:id',
    {
      schema: {
        tags: ['support-requests'],
        summary: 'A support session, including the services and time the replacement must cover',
        params: SupportRequestParamsSchema,
        response: { 200: SupportRequestSchema, ...errorResponses(400, 404, 500) },
      },
    },
    async (request) => supportRequests.get(request.params.id),
  );
};
