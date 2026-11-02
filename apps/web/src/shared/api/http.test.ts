import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, apiRequest, isApiRequestError } from './http';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function failure(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected the request to fail');
    },
    (error: unknown) => error,
  );
}

describe('apiRequest', () => {
  it('sends JSON and returns the parsed body', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await expect(apiRequest('/api/things', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/things',
      expect.objectContaining({
        method: 'POST',
        body: '{"a":1}',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      }),
    );
  });

  it('turns the API error envelope into a typed ApiRequestError', async () => {
    fetchMock.mockResolvedValue(
      json(404, {
        code: 'NOT_FOUND',
        message: "We couldn't find that support session.",
        requestId: 'req-123',
      }),
    );
    const error = await failure(apiRequest('/api/support-requests/nope'));
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      kind: 'api',
      status: 404,
      code: 'NOT_FOUND',
      requestId: 'req-123',
    });
    expect(isApiRequestError(error, 'NOT_FOUND')).toBe(true);
    expect(isApiRequestError(error, 'BOOKING_CONFLICT')).toBe(false);
  });

  it('treats a non-envelope error page (e.g. a proxy 502) as unexpected', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    expect(await failure(apiRequest('/api/x'))).toMatchObject({
      kind: 'unexpected',
      code: 'UNEXPECTED_RESPONSE',
    });
  });

  it('reports a network failure without leaking the browser message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await failure(apiRequest('/api/x'))).toMatchObject({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'We could not reach the service.',
    });
  });

  it('lets cancellations through untouched', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    fetchMock.mockRejectedValue(abort);
    const error = await failure(apiRequest('/api/x'));
    expect(error).toBe(abort);
    expect(error).not.toBeInstanceOf(ApiRequestError);
  });

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest('/api/demo/reset', { method: 'POST' })).resolves.toBeUndefined();
  });
});
