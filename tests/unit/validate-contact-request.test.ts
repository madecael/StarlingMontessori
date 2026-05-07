import { describe, it, expect } from "vitest";
import { contactRequestSchema } from "../../src/lib/validate-contact-request";

describe("contactRequestSchema", () => {
  it("accepts a valid request", () => {
    const data = { name: "Maria", email: "maria@example.com", subject: "Hi", message: "Hello", company: "" };
    expect(() => contactRequestSchema.parse(data)).not.toThrow();
  });
  it("rejects invalid email", () => {
    const data = { name: "x", email: "not-an-email", message: "test", company: "" };
    expect(() => contactRequestSchema.parse(data)).toThrow();
  });
  it("rejects empty message", () => {
    const data = { name: "x", email: "x@y.com", message: "", company: "" };
    expect(() => contactRequestSchema.parse(data)).toThrow();
  });
  it("rejects when honeypot 'company' is filled", () => {
    const data = { name: "x", email: "x@y.com", message: "test", company: "spam" };
    expect(() => contactRequestSchema.parse(data)).toThrow();
  });
});
