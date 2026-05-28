import { describe, it, expect } from "vitest";
import { roadmapRequestSchema, type RoadmapRequest } from "../../src/lib/validate-roadmap-request";

const validRequest: RoadmapRequest = {
  name: "Maria Hernandez",
  email: "maria@example.com",
  startDate: "fall_2026",
  childAge: "3_4",
  schedule: "half_day",
  visitsSoFar: "1_2",
  montessoriInterest: "curious_comparing",
  topConcern: "right_fit",
  zip: "20003",
  company: "",
};

describe("roadmapRequestSchema", () => {
  it("accepts a valid full request", () => {
    expect(() => roadmapRequestSchema.parse(validRequest)).not.toThrow();
  });

  it("rejects missing email", () => {
    const { email: _email, ...rest } = validRequest;
    expect(() => roadmapRequestSchema.parse(rest)).toThrow();
  });

  it("rejects invalid email", () => {
    const data = { ...validRequest, email: "not-an-email" };
    expect(() => roadmapRequestSchema.parse(data)).toThrow();
  });

  it("rejects invalid enum value for startDate", () => {
    const data = { ...validRequest, startDate: "spring_2026" };
    expect(() => roadmapRequestSchema.parse(data)).toThrow();
  });

  it("rejects when honeypot 'company' is filled", () => {
    const data = { ...validRequest, company: "I'm a bot" };
    expect(() => roadmapRequestSchema.parse(data)).toThrow();
  });

  it("rejects zip shorter than 3 characters", () => {
    const data = { ...validRequest, zip: "20" };
    expect(() => roadmapRequestSchema.parse(data)).toThrow();
  });

  it("rejects missing name", () => {
    const { name: _name, ...rest } = validRequest;
    expect(() => roadmapRequestSchema.parse(rest)).toThrow();
  });
});

describe("API contract sanity", () => {
  it("schema covers all keys the quiz form will send", () => {
    const sentByForm = [
      "name",
      "email",
      "startDate",
      "childAge",
      "schedule",
      "visitsSoFar",
      "montessoriInterest",
      "topConcern",
      "zip",
      "company",
    ];
    const known = Object.keys(roadmapRequestSchema.shape);
    for (const k of sentByForm) expect(known).toContain(k);
  });
});
