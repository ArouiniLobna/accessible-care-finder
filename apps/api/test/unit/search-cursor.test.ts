import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../../src/modules/workers/search-cursor';
import { AppError } from '../../src/shared/errors';

describe('search cursor', () => {
  it('round-trips exact numeric keys and the id tie-breaker', () => {
    const cursor = { sort: 'recommended' as const, keys: ['106.5964'], id: 'worker_017' };
    expect(decodeCursor(encodeCursor(cursor), 'recommended')).toEqual(cursor);
  });

  it('round-trips multi-key sorts', () => {
    const cursor = { sort: 'highest_rated' as const, keys: ['4.9', '42'], id: 'worker_017' };
    expect(decodeCursor(encodeCursor(cursor), 'highest_rated')).toEqual(cursor);
  });

  it('is opaque (not readable JSON) to the client', () => {
    const encoded = encodeCursor({ sort: 'closest', keys: ['2.4018'], id: 'worker_017' });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).not.toContain('worker_017');
  });

  const invalidCases: [string, string][] = [
    ['garbage', 'not-a-cursor!!'],
    ['valid base64 but not JSON', Buffer.from('hello').toString('base64url')],
    [
      'wrong version',
      Buffer.from(JSON.stringify({ v: 2, s: 'closest', k: ['1'], i: 'worker_001' })).toString(
        'base64url',
      ),
    ],
    [
      'wrong key count',
      Buffer.from(JSON.stringify({ v: 1, s: 'closest', k: ['1', '2'], i: 'worker_001' })).toString(
        'base64url',
      ),
    ],
    [
      'non-numeric key (injection attempt)',
      Buffer.from(
        JSON.stringify({ v: 1, s: 'closest', k: ['1; DROP TABLE workers'], i: 'worker_001' }),
      ).toString('base64url'),
    ],
    [
      'bad id',
      Buffer.from(JSON.stringify({ v: 1, s: 'closest', k: ['1'], i: "x' OR 1=1" })).toString(
        'base64url',
      ),
    ],
  ];

  it.each(invalidCases)('rejects %s with INVALID_CURSOR', (_label, raw) => {
    let caught: unknown;
    try {
      decodeCursor(raw, 'closest');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect(caught).toMatchObject({ code: 'INVALID_CURSOR', statusCode: 400 });
  });

  it('rejects a cursor issued for a different sort', () => {
    const encoded = encodeCursor({ sort: 'closest', keys: ['2.4'], id: 'worker_017' });
    expect(() => decodeCursor(encoded, 'lowest_rate')).toThrow(AppError);
  });
});
