import { describe, it, expect } from "vitest";
import { guideRequestSchema, type GuideRequest } from "../../src/lib/validate-guide-request";

describe("guideRequestSchema", () => {
  it("accepts a valid full request", () => {
    const data: GuideRequest = {
      parentName: "Maria Hernandez",
      email: "maria@example.com",
      zip: "20003",
      relocating: "moving from Chicago",
      childAge: "22 months",
      company: "",
    };
    expect(() => guideRequestSchema.parse(data)).not.toThrow();
  });

  it("accepts a request with only required fields", () => {
    const data = { parentName: "Sam Lee", email: "sam@example.com", company: "" };
    expect(() => guideRequestSchema.parse(data)).not.toThrow();
  });

  it("rejects missing email", () => {
    const data = { parentName: "Sam Lee", company: "" };
    expect(() => guideRequestSchema.parse(data)).toThrow();
  });

  it("rejects invalid email", () => {
    const data = { parentName: "Sam Lee", email: "not-an-email", company: "" };
    expect(() => guideRequestSchema.parse(data)).toThrow();
  });

  it("rejects when honeypot 'company' is filled", () => {
    const data = { parentName: "Sam Lee", email: "sam@example.com", company: "I'm a bot" };
    expect(() => guideRequestSchema.parse(data)).toThrow();
  });
});

describe("API contract sanity", () => {
  it("schema covers all keys the form sends", () => {
    const sentByForm = ["parentName", "email", "zip", "relocating", "childAge", "company"];
    const known = Object.keys(guideRequestSchema.shape);
    for (const k of sentByForm) expect(known).toContain(k);
  });
});
