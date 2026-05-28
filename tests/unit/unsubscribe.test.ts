import { describe, expect, it } from "vitest";
import { signEmail, verifyToken, unsubscribeUrl } from "../../src/lib/unsubscribe";

describe("signEmail", () => {
  it("returns a 64-char hex string", () => {
    const sig = signEmail("test@example.com", "secret");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });
  it("is deterministic — same inputs give same output", () => {
    const a = signEmail("test@example.com", "secret");
    const b = signEmail("test@example.com", "secret");
    expect(a).toBe(b);
  });
  it("is case-insensitive on email", () => {
    const a = signEmail("Test@Example.com", "secret");
    const b = signEmail("test@example.com", "secret");
    expect(a).toBe(b);
  });
  it("differs with different secrets", () => {
    const a = signEmail("test@example.com", "secret-a");
    const b = signEmail("test@example.com", "secret-b");
    expect(a).not.toBe(b);
  });
});

describe("verifyToken", () => {
  const secret = "test-secret";
  it("accepts a token generated from signEmail", () => {
    const t = signEmail("test@example.com", secret);
    expect(verifyToken("test@example.com", t, secret)).toBe(true);
  });
  it("rejects a token signed with a different secret", () => {
    const t = signEmail("test@example.com", "other-secret");
    expect(verifyToken("test@example.com", t, secret)).toBe(false);
  });
  it("rejects a malformed token", () => {
    expect(verifyToken("test@example.com", "not-a-token", secret)).toBe(false);
  });
  it("rejects empty token", () => {
    expect(verifyToken("test@example.com", "", secret)).toBe(false);
  });
});

describe("unsubscribeUrl", () => {
  it("produces a URL with email and token query params", () => {
    const url = unsubscribeUrl("test@example.com", "https://example.com", "secret");
    expect(url).toMatch(/email=test%40example\.com/);
    expect(url).toMatch(/token=[a-f0-9]{64}/);
  });
  it("strips trailing slash from baseUrl", () => {
    const url = unsubscribeUrl("test@example.com", "https://example.com/", "secret");
    expect(url).not.toMatch(/com\/\/api/);
  });
});
