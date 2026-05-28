import { describe, expect, it } from "vitest";

describe("nurture dispatcher TEMPLATES map", () => {
  it("has exactly 5 entries", async () => {
    const mod = await import("../../src/pages/api/nurture-dispatch");
    expect(mod).toBeDefined();
    expect(mod.TEMPLATES).toBeDefined();
    expect(Object.keys(mod.TEMPLATES)).toHaveLength(5);
  });

  it("contains all expected template keys matching NURTURE_SCHEDULE", async () => {
    const mod = await import("../../src/pages/api/nurture-dispatch");
    const { NURTURE_SCHEDULE } = await import("../../src/lib/nurture");
    const expectedKeys = NURTURE_SCHEDULE.map((s) => s.template);
    for (const key of expectedKeys) {
      expect(mod.TEMPLATES[key], `TEMPLATES should have key "${key}"`).toBeDefined();
      expect(typeof mod.TEMPLATES[key]).toBe("function");
    }
  });

  it("each template renders a subject, text, and html", async () => {
    const mod = await import("../../src/pages/api/nurture-dispatch");
    const params = { name: "Test Parent", unsubscribeUrl: "https://example.com/unsubscribe" };
    for (const [key, fn] of Object.entries(mod.TEMPLATES)) {
      const result = fn(params);
      expect(result.subject, `${key}: subject`).toBeTruthy();
      expect(result.text, `${key}: text`).toBeTruthy();
      expect(result.html, `${key}: html`).toBeTruthy();
    }
  });
});
