export interface AdsSummary {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cpc: number;
}

export interface AdsDaily {
  date: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
}

const STARLING_ACCOUNT_ID = "133-116-5701";
const WINDSOR_BASE = "https://connectors.windsor.ai/google_ads";

function normalizeAccountId(v: unknown): string {
  // Windsor sometimes returns account IDs with dashes ("133-116-5701"),
  // sometimes as plain digits ("1331165701"). Normalize both to plain digits.
  return String(v ?? "").replace(/\D/g, "");
}
const STARLING_ACCOUNT_NORM = normalizeAccountId(STARLING_ACCOUNT_ID);

async function windsorFetch<T extends Record<string, unknown>>(
  fields: string[],
  datePreset: string,
): Promise<T[]> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) throw new Error("WINDSOR_API_KEY env var not set");
  // Always request the account identifier so we can filter to Starling.
  const fieldSet = Array.from(new Set([...fields, "account_id"]));
  const params = new URLSearchParams({
    api_key: apiKey,
    fields: fieldSet.join(","),
    date_preset: datePreset,
  });
  const url = `${WINDSOR_BASE}?${params}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: "application/json" } });
  } catch (e) {
    const cause = (e as Error & { cause?: { code?: string; message?: string } }).cause;
    const causeMsg = cause?.code ? `${cause.code}: ${cause.message ?? ""}`.trim() : (e as Error).message;
    throw new Error(`Network error reaching connectors.windsor.ai — ${causeMsg}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Windsor API ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  const body = await res.json();
  const all = (Array.isArray(body) ? body : (body?.data ?? body?.result ?? [])) as T[];
  // Filter to Starling's Google Ads account only. The REST endpoint returns
  // all accounts on the API key by default; the MCP-style account_id filter
  // is not honored here, so we filter client-side.
  return all.filter((row) => normalizeAccountId(row.account_id) === STARLING_ACCOUNT_NORM);
}

export async function fetchSummary(datePreset: string): Promise<AdsSummary> {
  const rows = await windsorFetch(
    ["clicks", "impressions", "cost", "conversions", "conversion_value"],
    datePreset,
  );
  const totals = rows.reduce(
    (acc, r) => {
      acc.impressions += Number(r.impressions ?? 0);
      acc.clicks += Number(r.clicks ?? 0);
      acc.cost += Number(r.cost ?? 0);
      acc.conversions += Number(r.conversions ?? 0);
      acc.conversion_value += Number(r.conversion_value ?? 0);
      return acc;
    },
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 },
  );
  return {
    ...totals,
    ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
    cpc: totals.clicks ? totals.cost / totals.clicks : 0,
  };
}

export async function fetchDaily(datePreset: string): Promise<AdsDaily[]> {
  const rows = await windsorFetch(["date", "clicks", "impressions", "cost", "conversions"], datePreset);
  // Group by date in case the API returns multiple rows per day (e.g. one per campaign).
  const byDate = new Map<string, AdsDaily>();
  for (const r of rows) {
    if (!r.date) continue;
    const key = String(r.date);
    const prev = byDate.get(key) ?? { date: key, clicks: 0, impressions: 0, cost: 0, conversions: 0 };
    prev.clicks += Number(r.clicks ?? 0);
    prev.impressions += Number(r.impressions ?? 0);
    prev.cost += Number(r.cost ?? 0);
    prev.conversions += Number(r.conversions ?? 0);
    byDate.set(key, prev);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
