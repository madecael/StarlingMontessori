import type { APIRoute } from "astro";
import { z } from "zod";
import { addNote, updateStatus, STATUSES, AUTHORS, type Status, type Author } from "../../../lib/leads";

export const prerender = false;

const statusEnum = z.enum(STATUSES as [Status, ...Status[]]);
const authorEnum = z.enum(AUTHORS as [Author, ...Author[]]);

const baseSchema = z.object({
  email: z.string().trim().email().max(200),
  author: authorEnum,
  note: z.string().trim().max(5000).optional(),
});

const statusSchema = baseSchema.extend({
  action: z.literal("status"),
  value: statusEnum,
});

const noteSchema = baseSchema.extend({
  action: z.literal("note"),
  value: z.string().trim().min(1).max(5000),
});

const schema = z.discriminatedUnion("action", [statusSchema, noteSchema]);

export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
      { status: 422, headers: { "content-type": "application/json" } },
    );
  }

  const data = parsed.data;
  try {
    if (data.action === "status") {
      await updateStatus(data.email, data.value, data.author, data.note);
    } else {
      await addNote(data.email, data.value, data.author);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("lead-update failed", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
