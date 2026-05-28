import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getEntry } from "astro:content";
import { roadmapRequestSchema } from "../../lib/validate-roadmap-request";
import { upsertLead, addEvent } from "../../lib/leads";
import { composeRoadmap } from "../../lib/roadmap";
import { roadmapEmail } from "../../lib/emails/roadmap";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const parsed = roadmapRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation_failed", details: parsed.error.flatten() }),
      { status: 422, headers: { "content-type": "application/json" } },
    );
  }
  const { company: _company, ...validatedData } = parsed.data;

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) return new Response("Email service not configured", { status: 503 });

  const settings = (await getEntry("settings", "site"))!.data;

  const roadmap = composeRoadmap(validatedData);
  const email = roadmapEmail({ name: validatedData.name, roadmap });

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: settings.resendFromAddress,
      to: validatedData.email,
      replyTo: settings.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (err) {
    console.error("Resend error", err);
    return new Response("Send failed", { status: 502 });
  }

  const { startDate, childAge, schedule, visitsSoFar, montessoriInterest, topConcern, zip } =
    validatedData;

  try {
    await upsertLead({
      email: validatedData.email,
      name: validatedData.name,
      source: "roadmap_quiz",
      metadata: {
        quiz: {
          startDate,
          childAge,
          schedule,
          visitsSoFar,
          montessoriInterest,
          topConcern,
          zip,
        },
        lastNurtureStep: 0,
        zipFallback: roadmap.zipFallback,
      },
    });
    await addEvent({
      leadEmail: validatedData.email,
      type: "roadmap_completed",
      source: "roadmap_quiz",
      metadata: { zip, startDate, zipFallback: roadmap.zipFallback },
    });
  } catch (err) {
    console.error("Lead persistence error (roadmap-request)", err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
