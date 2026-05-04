import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getEntry } from "astro:content";
import { tourRequestSchema } from "../../lib/validate-tour-request";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const parsed = tourRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "validation_failed", details: parsed.error.flatten() }), { status: 422, headers: { "content-type": "application/json" } });
  }
  const data = parsed.data;
  const settings = (await getEntry("settings", "site"))!.data;

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) return new Response("Email service not configured", { status: 503 });

  const resend = new Resend(apiKey);
  const subject = `Tour request: ${data.parentName} (${data.page})`;
  const lines = [
    `Parent: ${data.parentName}`,
    `Email: ${data.email}`,
    `Child age: ${data.childAge}`,
    `Preferred week: ${data.preferredWeek || "—"}`,
    `Relocating: ${data.relocating || "—"}`,
    `Current Montessori: ${data.currentMontessori || "—"}`,
    `Source page: ${data.page}`,
  ];
  try {
    await resend.emails.send({
      from: settings.resendFromAddress,
      to: settings.tourEmailRecipient,
      replyTo: data.email,
      subject,
      text: lines.join("\n"),
    });
  } catch (err) {
    console.error("Resend error", err);
    return new Response("Send failed", { status: 502 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
};
