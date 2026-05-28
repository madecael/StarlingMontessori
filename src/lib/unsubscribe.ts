import { createHmac, timingSafeEqual } from "node:crypto";

export function signEmail(email: string, secret: string): string {
  return createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");
}

export function verifyToken(email: string, token: string, secret: string): boolean {
  if (!token || token.length !== 64) return false; // sha256 hex = 64 chars
  const expected = signEmail(email, secret);
  // timingSafeEqual requires equal-length Buffers
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(token, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string, baseUrl: string, secret: string): string {
  const token = signEmail(email, secret);
  const encoded = encodeURIComponent(email);
  return `${baseUrl.replace(/\/$/, "")}/api/unsubscribe?email=${encoded}&token=${token}`;
}
