import { describe, expect, it } from "vitest";
import { FEELINGS, GUEST_TIPS, hostTip, isScale } from "../src/lib/wellbeing";

describe("guest tips", () => {
  it("has a cited tip for every feeling", () => {
    for (const f of FEELINGS) {
      expect(GUEST_TIPS[f.id].text.length).toBeGreaterThan(20);
      expect(GUEST_TIPS[f.id].source.length).toBeGreaterThan(5);
    }
  });
  it("points people who are struggling to 988", () => {
    expect(GUEST_TIPS.struggling.source).toContain("988");
  });
  it("contains no em dashes", () => {
    expect(JSON.stringify(GUEST_TIPS)).not.toContain("—");
  });
});

describe("hostTip", () => {
  it("puts the most pressing need first", () => {
    expect(hostTip({ energy: 3, stress: 5, mood: 1 }).text).toContain("988");
    expect(hostTip({ energy: 1, stress: 5, mood: 3 }).text).toContain("10 minute gap");
    expect(hostTip({ energy: 1, stress: 2, mood: 3 }).text).toContain("Keep calls short");
    expect(hostTip({ energy: 3, stress: 2, mood: 2 }).text).toContain("walk outside");
    expect(hostTip({ energy: 5, stress: 1, mood: 5 }).text).toContain("focus time");
    expect(hostTip({ energy: 3, stress: 3, mood: 3 }).text).toContain("priorities");
  });
  it("validates 1 to 5 answers", () => {
    expect(isScale(3)).toBe(true);
    expect(isScale(0)).toBe(false);
    expect(isScale(6)).toBe(false);
    expect(isScale(2.5)).toBe(false);
    expect(isScale(Number("x"))).toBe(false);
  });
});
