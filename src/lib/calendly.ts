import { createHmac, timingSafeEqual } from "node:crypto";
import type { Program } from "./leads";

export const CALENDLY_API_BASE = "https://api.calendly.com";

/**
 * Verify a Calendly webhook signature.
 *
 * Per https://developer.calendly.com/api-docs/webhook-signatures the header is
 *   `Calendly-Webhook-Signature: t=<unix_seconds>,v1=<hex_hmac_sha256>`
 * The signed payload is `<unix_seconds>.<raw_request_body>`.
 *
 * Tolerance of 3 minutes guards against replay; matches Calendly's published guidance.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  toleranceSeconds = 180,
): boolean {
  if (!signatureHeader || !secret) return false;
  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(",")) {
    const [k, v] = segment.split("=");
    if (k && v !== undefined) parts[k.trim()] = v.trim();
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  const ts = parseInt(t, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) return false;

  const expectedHex = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");

  let expected: Buffer;
  let received: Buffer;
  try {
    expected = Buffer.from(expectedHex, "hex");
    received = Buffer.from(v1, "hex");
  } catch {
    return false;
  }
  if (expected.length !== received.length || expected.length === 0) return false;
  return timingSafeEqual(expected, received);
}

export type InviteeAction = "created" | "canceled";

export interface ParsedInvitee {
  action: InviteeAction;
  email: string;
  name: string;
  phone?: string;
  startTime?: string;
  endTime?: string;
  eventTypeName?: string;
  program?: Program;
  inviteeUri?: string;
  scheduledEventUri?: string;
  cancellation?: { reason?: string; canceledBy?: string };
  questionsAndAnswers: Array<{ question: string; answer: string }>;
  tracking?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

/**
 * Best-effort parser for Calendly's `invitee.created` / `invitee.canceled` webhook payloads.
 * Tolerates missing fields — Calendly's payload shape evolves over time and the only
 * truly required field for us is `email`.
 */
export function parseInviteeEvent(body: unknown): ParsedInvitee | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const event = String(root.event ?? "");
  const action: InviteeAction | null = event === "invitee.created"
    ? "created"
    : event === "invitee.canceled"
      ? "canceled"
      : null;
  if (!action) return null;

  const payload = (root.payload ?? {}) as Record<string, unknown>;
  const email = String(payload.email ?? "").trim();
  if (!email) return null;

  const firstName = String(payload.first_name ?? "").trim();
  const lastName = String(payload.last_name ?? "").trim();
  const fallbackName = `${firstName} ${lastName}`.trim();
  const name = String(payload.name ?? "").trim() || fallbackName || email;

  const scheduledEvent = (payload.scheduled_event ?? {}) as Record<string, unknown>;
  const eventTypeName = scheduledEvent.name ? String(scheduledEvent.name) : undefined;
  const startTime = scheduledEvent.start_time ? String(scheduledEvent.start_time) : undefined;
  const endTime = scheduledEvent.end_time ? String(scheduledEvent.end_time) : undefined;
  const scheduledEventUri = scheduledEvent.uri ? String(scheduledEvent.uri) : undefined;
  const inviteeUri = payload.uri ? String(payload.uri) : undefined;

  const program = inferProgram(eventTypeName);

  const qaRaw = Array.isArray(payload.questions_and_answers)
    ? (payload.questions_and_answers as Array<Record<string, unknown>>)
    : [];
  const questionsAndAnswers = qaRaw
    .map((q) => ({
      question: String(q.question ?? "").trim(),
      answer: String(q.answer ?? "").trim(),
    }))
    .filter((q) => q.question || q.answer);

  const phone = pickPhone(payload, questionsAndAnswers);

  const cancellation = (payload.cancellation ?? null) as Record<string, unknown> | null;

  return {
    action,
    email,
    name,
    phone,
    startTime,
    endTime,
    eventTypeName,
    program,
    inviteeUri,
    scheduledEventUri,
    cancellation: cancellation
      ? {
          reason: cancellation.reason ? String(cancellation.reason) : undefined,
          canceledBy: cancellation.canceled_by ? String(cancellation.canceled_by) : undefined,
        }
      : undefined,
    questionsAndAnswers,
    tracking: (payload.tracking ?? undefined) as Record<string, unknown> | undefined,
    raw: payload,
  };
}

function inferProgram(name?: string): Program | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  if (lower.includes("toddler")) return "toddler";
  if (lower.includes("primary")) return "primary";
  return undefined;
}

function pickPhone(
  payload: Record<string, unknown>,
  qa: Array<{ question: string; answer: string }>,
): string | undefined {
  const reminderPhone = payload.text_reminder_number;
  if (reminderPhone && typeof reminderPhone === "string" && reminderPhone.trim()) {
    return reminderPhone.trim();
  }
  for (const item of qa) {
    if (/phone|mobile|cell|tel/i.test(item.question) && item.answer) {
      return item.answer;
    }
  }
  return undefined;
}

// --- Webhook subscription API helpers (used by scripts/calendly-register-webhook.mjs) ---

export interface CalendlyUser {
  uri: string;
  organizationUri: string;
  email: string;
  name: string;
}

export async function getCurrentUser(token: string): Promise<CalendlyUser> {
  const res = await fetch(`${CALENDLY_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Calendly /users/me failed: ${res.status} ${await safeText(res)}`);
  }
  const json = (await res.json()) as { resource: { uri: string; current_organization: string; email: string; name: string } };
  return {
    uri: json.resource.uri,
    organizationUri: json.resource.current_organization,
    email: json.resource.email,
    name: json.resource.name,
  };
}

export interface WebhookSubscription {
  uri: string;
  callbackUrl: string;
  events: string[];
  scope: string;
  organization?: string;
  user?: string;
  state: string;
  createdAt: string;
}

export async function listWebhookSubscriptions(
  token: string,
  params: { organization: string; user?: string; scope: "organization" | "user" },
): Promise<WebhookSubscription[]> {
  const query = new URLSearchParams({
    organization: params.organization,
    scope: params.scope,
  });
  if (params.user) query.set("user", params.user);
  const res = await fetch(`${CALENDLY_API_BASE}/webhook_subscriptions?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Calendly list webhooks failed: ${res.status} ${await safeText(res)}`);
  }
  const json = (await res.json()) as { collection: Array<Record<string, unknown>> };
  return json.collection.map(mapSubscription);
}

export async function createWebhookSubscription(
  token: string,
  body: {
    url: string;
    events: string[];
    organization: string;
    user?: string;
    scope: "organization" | "user";
    signingKey: string;
  },
): Promise<WebhookSubscription> {
  const payload: Record<string, unknown> = {
    url: body.url,
    events: body.events,
    organization: body.organization,
    scope: body.scope,
    signing_key: body.signingKey,
  };
  if (body.user) payload.user = body.user;
  const res = await fetch(`${CALENDLY_API_BASE}/webhook_subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Calendly create webhook failed: ${res.status} ${await safeText(res)}`);
  }
  const json = (await res.json()) as { resource: Record<string, unknown> };
  return mapSubscription(json.resource);
}

function mapSubscription(r: Record<string, unknown>): WebhookSubscription {
  return {
    uri: String(r.uri ?? ""),
    callbackUrl: String(r.callback_url ?? ""),
    events: Array.isArray(r.events) ? (r.events as string[]) : [],
    scope: String(r.scope ?? ""),
    organization: r.organization ? String(r.organization) : undefined,
    user: r.user ? String(r.user) : undefined,
    state: String(r.state ?? ""),
    createdAt: String(r.created_at ?? ""),
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}
