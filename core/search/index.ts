export interface SearchParams {
  q?: string;
  manufacturer?: string;
  fixtureType?: string;
  channelMin?: number;
  channelMax?: number;
  compatibility?: string[];
  tags?: string[];
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

function intParam(value: string | null, fallback: number, { min = 1, max = Infinity } = {}): number {
  if (value === null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

function strList(values: string[]): string[] | undefined {
  const out = values
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return out.length ? Array.from(new Set(out)) : undefined;
}

/** Parse and normalize raw query-string parameters into typed SearchParams. */
export function parseSearchParams(params: URLSearchParams): SearchParams {
  const trimmed = (k: string) => {
    const v = params.get(k);
    return v && v.trim() ? v.trim() : undefined;
  };

  const min = params.get("channelMin");
  const max = params.get("channelMax");

  return {
    q: trimmed("q"),
    manufacturer: trimmed("manufacturer"),
    fixtureType: trimmed("fixtureType"),
    channelMin: min !== null && Number.isFinite(Number(min)) ? Math.max(0, Math.trunc(Number(min))) : undefined,
    channelMax: max !== null && Number.isFinite(Number(max)) ? Math.max(0, Math.trunc(Number(max))) : undefined,
    compatibility: strList(params.getAll("compatibility")),
    tags: strList(params.getAll("tags")),
    page: intParam(params.get("page"), 1, { min: 1 }),
    pageSize: intParam(params.get("pageSize"), DEFAULT_PAGE_SIZE, { min: 1, max: MAX_PAGE_SIZE }),
  };
}
