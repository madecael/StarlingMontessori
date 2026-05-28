import { describe, expect, it } from "vitest";
import type { Source, EventType } from "../../src/lib/leads";

describe("leads source + event unions", () => {
  it("includes guide_download as a Source", () => {
    const s: Source = "guide_download";
    expect(s).toBe("guide_download");
  });
  it("includes roadmap_quiz as a Source", () => {
    const s: Source = "roadmap_quiz";
    expect(s).toBe("roadmap_quiz");
  });
  it("includes chat as a Source", () => {
    const s: Source = "chat";
    expect(s).toBe("chat");
  });
  it("includes nurture_email_sent as an EventType", () => {
    const e: EventType = "nurture_email_sent";
    expect(e).toBe("nurture_email_sent");
  });
  it("includes guide_downloaded as an EventType", () => {
    const e: EventType = "guide_downloaded";
    expect(e).toBe("guide_downloaded");
  });
  it("includes roadmap_completed as an EventType", () => {
    const e: EventType = "roadmap_completed";
    expect(e).toBe("roadmap_completed");
  });
});
