import { describe, expect, it } from "vitest";
import { roadmapEmail } from "../../src/lib/emails/roadmap";
import { composeRoadmap } from "../../src/lib/roadmap";

describe("roadmapEmail", () => {
  const roadmap = composeRoadmap({
    name: "Test Parent",
    email: "p@example.com",
    startDate: "fall_2026",
    childAge: "3_4",
    schedule: "full_day",
    visitsSoFar: "1_2",
    montessoriInterest: "curious_comparing",
    topConcern: "right_fit",
    zip: "20003",
  });

  it("subject mentions a personal roadmap", () => {
    expect(roadmapEmail({ name: "Anna", roadmap }).subject).toMatch(/roadmap/i);
  });
  it("html includes at least one non-Starling school", () => {
    const html = roadmapEmail({ name: "Anna", roadmap }).html;
    const nonStarling = roadmap.schools.find((s) => !s.isStarling);
    expect(html).toContain(nonStarling!.name);
  });
  it("html includes the literal 'even if Starling' phrase", () => {
    const html = roadmapEmail({ name: "Anna", roadmap }).html;
    expect(html).toMatch(/even if Starling/i);
  });
  it("text version also includes the comparable phrase", () => {
    const text = roadmapEmail({ name: "Anna", roadmap }).text;
    expect(text).toMatch(/even if Starling/i);
  });
});
