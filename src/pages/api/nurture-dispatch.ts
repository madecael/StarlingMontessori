import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getEntry } from "astro:content";
import { listLeads, upsertLead, addEvent } from "../../lib/leads";
import { nextNurtureStep } from "../../lib/nurture";
import { unsubscribeUrl as buildUnsubscribeUrl } from "../../lib/unsubscribe";
import { nurture1 } from "../../lib/emails/nurture-1-tour-prep";
import { nurture2 } from "../../lib/emails/nurture-2-parents-questions";
import { nurture3 } from "../../lib/emails/nurture-3-applications-open";
import { nurture4 } from "../../lib/emails/nurture-4-no-pressure-tour";
import { nurture5 } from "../../lib/emails/nurture-5-soft-goodbye";

export const prerender = false;

type TemplateFn = (p: { name: string; unsubscribeUrl: string }) => {
  subject: string;
  text: string;
  html: string;
};

export const TEMPLATES: Record<string, TemplateFn> = {
  "nurture-1-tour-prep": nurture1,
  "nurture-2-parents-questions": nurture2,
  "nurture-3-applications-open": nurture3,
  "nurture-4-no-pressure-tour": nurture4,
  "nurture-5-soft-goodbye": nurture5,
};

export const GET: APIRoute = async ({ request }) => {
  // 1. Auth check
  const dispatchSecret = import.meta.env.DISPATCH_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  if (!dispatchSecret || authHeader !== `Bearer ${dispatchSecret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // 2. Required env vars
  const resendApiKey = import.meta.env.RESEND_API_KEY;
  const unsubscribeSecret = import.meta.env.UNSUBSCRIBE_SECRET;
  if (!resendApiKey || !unsubscribeSecret) {
    return new Response(
      JSON.stringify({ error: "missing_env", detail: "RESEND_API_KEY and UNSUBSCRIBE_SECRET required" }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }

  const baseUrl =
    import.meta.env.ASTRO_SITE?.replace(/\/$/, "") ?? "https://starlingmontessorischool.com";

  const settings = (await getEntry("settings", "site"))!.data;
  const resend = new Resend(resendApiKey);

  // 3. Load all leads and filter to eligible nurture candidates
  const allLeads = await listLeads();
  const candidates = allLeads.filter(
    (l) => l.source === "roadmap_quiz" && l.metadata.unsubscribed !== true,
  );

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const lead of candidates) {
    try {
      const lastNurtureStep =
        typeof lead.metadata.lastNurtureStep === "number" ? lead.metadata.lastNurtureStep : 0;

      const step = nextNurtureStep({
        firstContactAt: lead.firstContactAt,
        lastNurtureStep,
      });

      if (!step) {
        skipped++;
        continue;
      }

      const templateFn = TEMPLATES[step.template];
      if (!templateFn) {
        errors.push({ email: lead.email, error: `Unknown template: ${step.template}` });
        continue;
      }

      const unsub = buildUnsubscribeUrl(lead.email, baseUrl, unsubscribeSecret);
      const rendered = templateFn({ name: lead.name, unsubscribeUrl: unsub });

      await resend.emails.send({
        from: settings.resendFromAddress,
        to: lead.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });

      const now = new Date().toISOString();

      await upsertLead({
        email: lead.email,
        name: lead.name,
        source: lead.source,
        metadata: {
          ...lead.metadata,
          lastNurtureStep: step.step,
          lastNurtureSentAt: now,
        },
      });

      await addEvent({
        leadEmail: lead.email,
        type: "nurture_email_sent",
        source: "admin",
        metadata: { step: step.step, template: step.template },
      });

      sent++;
    } catch (err) {
      console.error(`nurture-dispatch: error processing ${lead.email}`, err);
      errors.push({
        email: lead.email,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      scanned: candidates.length,
      sent,
      skipped,
      errors,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
