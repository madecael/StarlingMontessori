import type { APIRoute } from "astro";
import { parseInviteeEvent, verifyWebhookSignature } from "../../lib/calendly";
import { addEvent, upsertLead } from "../../lib/leads";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[calendly-webhook] CALENDLY_WEBHOOK_SECRET not set");
    return new Response("Webhook not configured", { status: 503 });
  }

  // Must read raw body before JSON parse — HMAC is computed over exact bytes.
  const rawBody = await request.text();
  const signature = request.headers.get("calendly-webhook-signature");

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.warn("[calendly-webhook] invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const invitee = parseInviteeEvent(body);
  if (!invitee) {
    // Acknowledge unknown event types with 200 so Calendly doesn't retry forever.
    console.log("[calendly-webhook] ignoring event", (body as { event?: unknown } | null)?.event);
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const timestamp = invitee.startTime ?? new Date().toISOString();

  const metadataFromQa = invitee.questionsAndAnswers.reduce<Record<string, string>>((acc, qa) => {
    if (qa.question) acc[qa.question] = qa.answer;
    return acc;
  }, {});

  try {
    await upsertLead({
      email: invitee.email,
      name: invitee.name,
      phone: invitee.phone,
      program: invitee.program,
      source: "calendly",
      timestamp,
      metadata: {
        calendlyEventType: invitee.eventTypeName,
        calendlyTracking: invitee.tracking,
        calendlyQuestions: metadataFromQa,
      },
    });

    await addEvent({
      leadEmail: invitee.email,
      type: invitee.action === "created" ? "tour_booked" : "tour_canceled",
      source: "calendly",
      timestamp,
      metadata: {
        eventTypeName: invitee.eventTypeName,
        program: invitee.program,
        startTime: invitee.startTime,
        endTime: invitee.endTime,
        scheduledEventUri: invitee.scheduledEventUri,
        inviteeUri: invitee.inviteeUri,
        cancellation: invitee.cancellation,
      },
      ...(invitee.inviteeUri ? { dedupeKey: `${invitee.action}:${invitee.inviteeUri}` } : {}),
    });
  } catch (err) {
    console.error("[calendly-webhook] persistence error", err);
    return new Response("Persistence error", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
