import { createHash } from "node:crypto";
import type { APIRoute } from "astro";

export const prerender = false;

const COOKIE_NAME = "starling_admin";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return new Response("Admin disabled: ADMIN_PASSWORD env var not set.", { status: 503 });
  }
  if (password !== expected) {
    return redirect("/admin/login?error=1");
  }
  const hash = createHash("sha256").update(expected).digest("hex");
  cookies.set(COOKIE_NAME, hash, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return redirect("/admin/dashboard");
};
