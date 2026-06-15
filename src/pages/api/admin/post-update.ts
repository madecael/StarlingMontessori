import type { APIRoute } from "astro";
import { z } from "zod";
import {
  updatePostContent,
  setPostStatus,
  reschedulePost,
  POST_STATUSES,
  SOCIAL_AUTHORS,
  type PostStatus,
  type SocialAuthor,
} from "../../../lib/social";

export const prerender = false;

const statusEnum = z.enum(POST_STATUSES as [PostStatus, ...PostStatus[]]);
const authorEnum = z.enum(SOCIAL_AUTHORS as [SocialAuthor, ...SocialAuthor[]]);

const contentSchema = z.object({
  action: z.literal("content"),
  id: z.string().trim().min(1),
  title: z.string().trim().max(2000).optional(),
  caption: z.string().trim().max(8000).optional(),
  hashtags: z.string().trim().max(2000).optional(),
  cta: z.string().trim().max(2000).optional(),
  bioLink: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(8000).optional(),
});

const statusSchema = z.object({
  action: z.literal("status"),
  id: z.string().trim().min(1),
  value: statusEnum,
  author: authorEnum,
});

const rescheduleSchema = z.object({
  action: z.literal("reschedule"),
  id: z.string().trim().min(1),
  date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]),
});

const schema = z.discriminatedUnion("action", [contentSchema, statusSchema, rescheduleSchema]);

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
    let post;
    if (data.action === "content") {
      const patch: {
        title?: string;
        caption?: string;
        hashtags?: string;
        cta?: string;
        bioLink?: string;
        notes?: string;
      } = {};
      if (data.title !== undefined) patch.title = data.title;
      if (data.caption !== undefined) patch.caption = data.caption;
      if (data.hashtags !== undefined) patch.hashtags = data.hashtags;
      if (data.cta !== undefined) patch.cta = data.cta;
      if (data.bioLink !== undefined) patch.bioLink = data.bioLink;
      if (data.notes !== undefined) patch.notes = data.notes;
      post = await updatePostContent(data.id, patch);
    } else if (data.action === "status") {
      post = await setPostStatus(data.id, data.value, data.author);
    } else {
      post = await reschedulePost(data.id, data.date);
    }
    return new Response(JSON.stringify({ ok: true, post }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("post-update failed", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
