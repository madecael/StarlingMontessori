import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getEntry } from "astro:content";
import { tourRequestSchema } from "../../lib/validate-tour-request";
import { upsertLead, addEvent, type Program } from "../../lib/leads";

export const prerender = false;

function inferProgramFromPage(page: string): Program | undefined {
  const p = page.toLowerCase();
  if (p.includes("toddler")) return "toddler";
  if (p.includes("primary")) return "primary";
  return undefined;
}

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
  try {
    await upsertLead({
      email: data.email,
      name: data.parentName,
      childAge: data.childAge,
      program: inferProgramFromPage(data.page),
      source: "tour_form",
      metadata: {
        page: data.page,
        preferredWeek: data.preferredWeek,
        relocating: data.relocating,
        currentMontessori: data.currentMontessori,
      },
    });
    await addEvent({
      leadEmail: data.email,
      type: "form_submit",
      source: "tour_form",
      metadata: { page: data.page },
    });
  } catch (err) {
    console.error("Lead persistence error (tour-request)", err);
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
};
