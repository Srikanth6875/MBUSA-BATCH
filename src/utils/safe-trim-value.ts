export function normalizeString(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str.length ? str : undefined;
}

export function normalizeNullableString(value: any): string | null {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

export function normalizeNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

export function normalizeNullableNumber(value: any): number | null {
  const num = normalizeNumber(value);
  return num === undefined ? null : num;
}

export function normalizeBoolean(value: any): boolean {
  if (value === true || value === 1) return true;

  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(v);
  }

  return false;
}

export function normalizeCsvValue(value: any): string | number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  return undefined;
}

export function normalizeStringArray(value: any, delimiter = ','): string[] {
  const str = normalizeString(value);
  if (!str) return [];
  return str
    .split(delimiter)
    .map((v) => v.trim())
    .filter(Boolean);
}

export const boolToInt = (value: boolean) => (value ? 1 : 0);
