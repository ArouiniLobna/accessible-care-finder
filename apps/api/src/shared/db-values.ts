/**
 * node-postgres returns numeric/bigint as strings and json as parsed values. Raw SQL rows are
 * `unknown` until checked here, so a schema drift fails loudly instead of leaking bad data.
 */
function fail(field: string, expected: string, value: unknown): never {
  throw new Error(
    `Unexpected database value for ${field}: expected ${expected}, got ${typeof value}`,
  );
}

export function readString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  return typeof value === 'string' ? value : fail(field, 'string', value);
}

export function readNumber(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fail(field, 'number', value);
}

export function readDate(row: Record<string, unknown>, field: string): Date {
  const value = row[field];
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return fail(field, 'timestamp', value);
}

/** json_agg(...) yields null for "no rows"; treat that as an empty list. */
export function readJsonArray<T>(
  row: Record<string, unknown>,
  field: string,
  parseItem: (item: Record<string, unknown>) => T,
): T[] {
  const value = row[field];
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) return fail(field, 'array', value);
  return value.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) return fail(field, 'object item', item);
    return parseItem(item as Record<string, unknown>);
  });
}

export const parseService = (item: Record<string, unknown>) => ({
  id: readString(item, 'id'),
  name: readString(item, 'name'),
});

/** Sort-key values (numeric → string, integer → number) normalised to an exact string. */
export function readSortKey(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fail(field, 'sortable value', value);
}

export function readBoolean(row: Record<string, unknown>, field: string): boolean {
  const value = row[field];
  return typeof value === 'boolean' ? value : fail(field, 'boolean', value);
}

export function readNullableString(row: Record<string, unknown>, field: string): string | null {
  return row[field] === null || row[field] === undefined ? null : readString(row, field);
}

export const parseLanguage = (item: Record<string, unknown>) => ({
  code: readString(item, 'code'),
  name: readString(item, 'name'),
});

/** Round to one decimal for display-oriented distances. */
export const roundKm = (km: number) => Math.round(km * 10) / 10;
