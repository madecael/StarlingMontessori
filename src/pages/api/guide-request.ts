import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getEntry } from "astro:content";
import { guideRequestSchema } from "../../lib/validate-guide-request";
import { upsertLead, addEvent } from "../../lib/leads";
import { guideDeliveryEmail } from "../../lib/emails/guide-delivery";

export const prerender = false;

const PDF_URL = "https://starlingmontessorischool.com/Starling_Preschool_Decision_Guide.pdf";

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const parsed = guideRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation_failed", details: parsed.error.flatten() }),
      { status: 422, headers: { "content-type": "application/json" } },
    );
  }
  const data = parsed.data;

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) return new Response("Email service not configured", { status: 503 });

  const settings = (await getEntry("settings", "site"))!.data;

  const email = guideDeliveryEmail({ name: data.parentName, pdfUrl: PDF_URL });

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: settings.resendFromAddress,
      to: data.email,
      replyTo: "info@starlingmontessorischool.com",
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (err) {
    console.error("Resend error", err);
    return new Response("Send failed", { status: 502 });
  }

  try {
    await upsertLead({
      email: data.email,
      name: data.parentName,
      source: "guide_download",
      metadata: {
        zip: data.zip,
        relocating: data.relocating,
        childAge: data.childAge,
      },
    });
    await addEvent({
      leadEmail: data.email,
      type: "guide_downloaded",
      source: "guide_download",
      metadata: { zip: data.zip, relocating: data.relocating },
    });
  } catch (err) {
    console.error("Lead persistence error (guide-request)", err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
