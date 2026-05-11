import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getEntry } from "astro:content";
import {
  careerApplicationSchema,
  ALLOWED_CV_TYPES,
  ALLOWED_CV_EXTENSIONS,
  MAX_CV_BYTES,
} from "../../lib/validate-career-application";

export const prerender = false;

const hasAllowedExtension = (filename: string) =>
  ALLOWED_CV_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext));

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const fields = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    note: String(form.get("note") ?? ""),
    company: String(form.get("company") ?? ""),
  };
  const parsed = careerApplicationSchema.safeParse(fields);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation_failed", details: parsed.error.flatten() }),
      { status: 422, headers: { "content-type": "application/json" } },
    );
  }

  const cv = form.get("cv");
  if (!(cv instanceof File) || cv.size === 0) {
    return new Response(JSON.stringify({ error: "cv_required" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }
  if (cv.size > MAX_CV_BYTES) {
    return new Response(JSON.stringify({ error: "cv_too_large" }), {
      status: 413,
      headers: { "content-type": "application/json" },
    });
  }
  if (!ALLOWED_CV_TYPES.includes(cv.type as (typeof ALLOWED_CV_TYPES)[number]) && !hasAllowedExtension(cv.name)) {
    return new Response(JSON.stringify({ error: "cv_unsupported_type" }), {
      status: 415,
      headers: { "content-type": "application/json" },
    });
  }

  const data = parsed.data;
  const settings = (await getEntry("settings", "site"))!.data;

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) return new Response("Email service not configured", { status: 503 });

  const resend = new Resend(apiKey);
  const cvBytes = new Uint8Array(await cv.arrayBuffer());
  const cvBase64 = Buffer.from(cvBytes).toString("base64");

  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Note:`,
    data.note || "—",
    "",
    `CV attached: ${cv.name} (${(cv.size / 1024).toFixed(1)} KB)`,
  ];

  try {
    await resend.emails.send({
      from: settings.resendFromAddress,
      to: settings.tourEmailRecipient,
      replyTo: data.email,
      subject: `Career application: ${data.name}`,
      text: lines.join("\n"),
      attachments: [{ filename: cv.name, content: cvBase64 }],
    });
  } catch (err) {
    console.error("Resend error (career-application)", err);
    return new Response("Send failed", { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
