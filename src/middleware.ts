import { defineMiddleware } from "astro:middleware";
import { createHash } from "node:crypto";

const COOKIE_NAME = "starling_admin";

function expectedHash(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(pw).digest("hex");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = new URL(context.request.url).pathname;
  const guarded = path.startsWith("/admin/") || path.startsWith("/api/admin/");
  const open = path === "/admin/login" || path === "/api/admin/login";
  if (!guarded || open) return next();

  const expected = expectedHash();
  if (!expected) {
    return new Response("Admin disabled: ADMIN_PASSWORD env var not set on server.", {
      status: 503,
      headers: { "content-type": "text/plain" },
    });
  }
  const cookie = context.cookies.get(COOKIE_NAME)?.value;
  if (cookie !== expected) {
    return context.redirect("/admin/login");
  }
  return next();
});
