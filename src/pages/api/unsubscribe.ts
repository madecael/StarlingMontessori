import type { APIRoute } from "astro";
import { verifyToken } from "../../lib/unsubscribe";
import { upsertLead, getLead, addEvent } from "../../lib/leads";

export const prerender = false;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    (
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }) as Record<string, string>
    )[c]!,
  );
}

const CONFIRMATION_HTML = (email: string) => `
<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed — Starling Montessori</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 540px; margin: 4rem auto; padding: 0 1.5rem; color: #0C163D; background: #FFF7EB; }
  h1 { font-family: Georgia, serif; font-style: italic; font-weight: 400; font-size: 2rem; }
  p { line-height: 1.6; color: #4A557A; }
  .eyebrow { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; color: #8B5C7E; margin-bottom: 1rem; }
  a { color: #8B5C7E; }
</style></head><body>
  <div class="eyebrow">Unsubscribed</div>
  <h1>You're off the list.</h1>
  <p>We won't send any more emails to <strong>${escapeHtml(email)}</strong>.</p>
  <p>If you ever want to reach out — about Starling or about another school — you can email us at <a href="mailto:info@starlingmontessorischool.com">info@starlingmontessorischool.com</a> anytime.</p>
  <p>— Fabienne</p>
</body></html>
`;

export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  const secret = import.meta.env.UNSUBSCRIBE_SECRET;

  if (!email || !token || !secret) {
    return new Response("Missing required parameters", { status: 400 });
  }

  if (!verifyToken(email, token, secret)) {
    return new Response("Invalid or expired unsubscribe link", { status: 401 });
  }

  // Mark unsubscribed
  try {
    const existing = await getLead(email);
    if (existing) {
      await upsertLead({
        email,
        name: existing.name,
        source: existing.source,
        metadata: {
          ...existing.metadata,
          unsubscribed: true,
          unsubscribedAt: new Date().toISOString(),
        },
      });
      await addEvent({
        leadEmail: email,
        type: "form_submit", // TODO: add dedicated "unsubscribed" EventType in a follow-up task
        source: "admin",
        metadata: { action: "unsubscribed" },
      });
    }
    // If no existing lead, still return success — the unsubscribe is honored on any future attempt
  } catch (err) {
    console.error("Unsubscribe persistence error", err);
    // Still return success to the user — we don't want to leak DB state
  }

  return new Response(CONFIRMATION_HTML(email), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};
