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

async function windsorFetch<T>(fields: string[], datePreset: string): Promise<T[]> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) throw new Error("WINDSOR_API_KEY env var not set");
  const params = new URLSearchParams({
    api_key: apiKey,
    account_id: STARLING_ACCOUNT_ID,
    fields: fields.join(","),
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
  // Windsor returns either {data: [...]}, {result: [...]}, or [...] directly
  const rows = Array.isArray(body) ? body : (body?.data ?? body?.result ?? []);
  return rows as T[];
}

export async function fetchSummary(datePreset: string): Promise<AdsSummary> {
  const rows = await windsorFetch<Record<string, unknown>>(
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
  const rows = await windsorFetch<Record<string, unknown>>(
    ["date", "clicks", "impressions", "cost", "conversions"],
    datePreset,
  );
  return rows
    .filter((r) => r.date)
    .map((r) => ({
      date: String(r.date),
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      cost: Number(r.cost ?? 0),
      conversions: Number(r.conversions ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
