import { describe, it, expect } from "vitest";
import { careerApplicationSchema } from "../../src/lib/validate-career-application";

describe("careerApplicationSchema", () => {
  it("accepts a valid application", () => {
    const data = { name: "Ana Diaz", email: "ana@example.com", phone: "(202) 555-1234", note: "I would love to join Starling.", company: "" };
    expect(() => careerApplicationSchema.parse(data)).not.toThrow();
  });
  it("accepts a valid application without a note", () => {
    const data = { name: "Ana", email: "ana@example.com", phone: "2025551234", company: "" };
    expect(() => careerApplicationSchema.parse(data)).not.toThrow();
  });
  it("rejects invalid email", () => {
    const data = { name: "Ana", email: "not-an-email", phone: "2025551234", company: "" };
    expect(() => careerApplicationSchema.parse(data)).toThrow();
  });
  it("rejects short phone", () => {
    const data = { name: "Ana", email: "ana@example.com", phone: "123", company: "" };
    expect(() => careerApplicationSchema.parse(data)).toThrow();
  });
  it("rejects empty name", () => {
    const data = { name: "  ", email: "ana@example.com", phone: "2025551234", company: "" };
    expect(() => careerApplicationSchema.parse(data)).toThrow();
  });
  it("rejects when honeypot is filled", () => {
    const data = { name: "Ana", email: "ana@example.com", phone: "2025551234", company: "spam" };
    expect(() => careerApplicationSchema.parse(data)).toThrow();
  });
});
