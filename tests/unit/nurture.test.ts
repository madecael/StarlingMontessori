import { describe, expect, it } from "vitest";
import { nextNurtureStep, NURTURE_SCHEDULE } from "../../src/lib/nurture";

const D = (daysAgo: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
};

describe("nextNurtureStep", () => {
  it("returns null when no step is due yet", () => {
    expect(nextNurtureStep({ firstContactAt: D(0), lastNurtureStep: 0 })).toBeNull();
  });
  it("returns step 1 at day 3 with no prior step", () => {
    expect(nextNurtureStep({ firstContactAt: D(3), lastNurtureStep: 0 })?.step).toBe(1);
  });
  it("returns step 2 at day 7 with prior step 1", () => {
    expect(nextNurtureStep({ firstContactAt: D(7), lastNurtureStep: 1 })?.step).toBe(2);
  });
  it("returns null when already sent step 5", () => {
    expect(nextNurtureStep({ firstContactAt: D(100), lastNurtureStep: 5 })).toBeNull();
  });
  it("skips ahead correctly if lead joined and never got step 1", () => {
    // Day 14 — eligible for step 1 (day 3), step 2 (day 7), but we only send the next one
    expect(nextNurtureStep({ firstContactAt: D(14), lastNurtureStep: 0 })?.step).toBe(1);
  });
  it("NURTURE_SCHEDULE has exactly 5 steps", () => {
    expect(NURTURE_SCHEDULE).toHaveLength(5);
  });
});
