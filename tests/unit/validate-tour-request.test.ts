import { describe, it, expect } from "vitest";
import { tourRequestSchema, type TourRequest } from "../../src/lib/validate-tour-request";

describe("tourRequestSchema", () => {
  it("accepts a valid request", () => {
    const data: TourRequest = {
      parentName: "Maria Hernandez",
      email: "maria@example.com",
      childAge: "22 months",
      preferredWeek: "May 6–10",
      relocating: "",
      currentMontessori: "",
      company: "",
      page: "toddler-capitol-hill",
    };
    expect(() => tourRequestSchema.parse(data)).not.toThrow();
  });

  it("rejects missing parentName", () => {
    const data = { email: "x@y.com", childAge: "2y" };
    expect(() => tourRequestSchema.parse(data)).toThrow();
  });

  it("rejects invalid email", () => {
    const data = { parentName: "x", email: "not-an-email", childAge: "2y" };
    expect(() => tourRequestSchema.parse(data)).toThrow();
  });

  it("rejects when honeypot 'company' is filled", () => {
    const data = { parentName: "x", email: "x@y.com", childAge: "2y", company: "I'm a bot" };
    expect(() => tourRequestSchema.parse(data)).toThrow();
  });
});
