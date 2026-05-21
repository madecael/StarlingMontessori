import type { APIRoute } from "astro";

export const prerender = false;

const COOKIE_NAME = "starling_admin";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete(COOKIE_NAME, { path: "/" });
  return redirect("/admin/login");
};
