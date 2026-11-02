import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import type { AvailabilityEventHub } from './availability.events';

export const availabilityEventRoutes: FastifyPluginAsyncTypebox<{
  hub: AvailabilityEventHub;
}> = async (app, { hub }) => {
  app.get(
    '/availability',
    {
      schema: {
        tags: ['realtime'],
        summary: 'Server-Sent Events stream of availability changes',
        description: [
          'Content-Type: text/event-stream. Consume with the browser `EventSource` API.',
          '',
          '- `event: availability.changed` — data is an `AvailabilityChangedEvent` (see schemas). Each has an `id`.',
          '- `event: availability.resync` — cached availability may be stale; refetch.',
          '- `: heartbeat` comment lines keep idle connections open.',
          '',
          'Reconnecting clients send `Last-Event-ID`; missed events are replayed when possible, otherwise a resync is sent.',
          'Events are advisory: bookings are always re-validated in a database transaction.',
        ].join('\n'),
        headers: Type.Object({ 'last-event-id': Type.Optional(Type.String({ maxLength: 64 })) }),
        produces: ['text/event-stream'],
      },
    },
    async (request, reply) => {
      // Take over the raw socket: Fastify would otherwise end the response after the handler.
      reply.hijack();
      const raw = reply.raw;
      // Keep headers already set by hooks (CORS, request id, security headers).
      const inherited: Record<string, string | number | string[]> = {};
      for (const [name, value] of Object.entries(reply.getHeaders())) {
        if (value !== undefined) inherited[name] = value;
      }
      raw.writeHead(200, {
        ...inherited,
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        // Disable proxy buffering (nginx) so events are delivered immediately.
        'x-accel-buffering': 'no',
      });
      raw.flushHeaders();

      const unsubscribe = hub.subscribe(
        { write: (chunk) => raw.write(chunk) },
        request.headers['last-event-id'],
      );
      request.log.info({ clients: hub.clientCount }, 'sse client connected');

      request.raw.on('close', () => {
        unsubscribe();
        request.log.info({ clients: hub.clientCount }, 'sse client disconnected');
      });
    },
  );
};
