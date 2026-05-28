import { describe, expect, it } from "vitest";
import { composeRoadmap, type QuizAnswers } from "../../src/lib/roadmap";

const base: QuizAnswers = {
  name: "Test Parent",
  email: "p@example.com",
  startDate: "fall_2026",
  childAge: "3_4",
  schedule: "full_day",
  visitsSoFar: "1_2",
  montessoriInterest: "curious_comparing",
  topConcern: "right_fit",
  zip: "20003",
};

describe("composeRoadmap", () => {
  it("returns 'visit 1-2 more' guidance when visitor has 1-2 visits", () => {
    const r = composeRoadmap(base);
    expect(r.nextStep).toMatch(/Visit 1–2 more/i);
  });
  it("includes Starling and at least 1 comparable when zip matches a cluster", () => {
    const r = composeRoadmap(base);
    expect(r.schools.some((s) => s.name === "Starling Montessori School")).toBe(true);
    expect(r.schools.length).toBeGreaterThanOrEqual(2);
  });
  it("falls back to nearest cluster when zip is unknown", () => {
    const r = composeRoadmap({ ...base, zip: "99999" });
    expect(r.schools.length).toBeGreaterThan(0);
    expect(r.zipFallback).toBe(true);
  });
  it("returns urgent timeline when startDate is summer_2026", () => {
    const r = composeRoadmap({ ...base, startDate: "summer_2026" });
    expect(r.timeline[0].label).toMatch(/Apply now/i);
  });
  it("returns 'start by visiting 2-3' guidance when visitor has visited none", () => {
    const r = composeRoadmap({ ...base, visitsSoFar: "none" });
    expect(r.nextStep).toMatch(/Start by visiting/i);
  });
  it("returns 'ready to apply' guidance when visitor has visited 3+", () => {
    const r = composeRoadmap({ ...base, visitsSoFar: "three_plus" });
    expect(r.nextStep).toMatch(/ready to apply/i);
  });
});
