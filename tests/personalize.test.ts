import { describe, expect, it } from "vitest";
import { COMMON_PROMPTS, sameAnswer, TOUCHES } from "../src/lib/personalize";

describe("personal touches", () => {
  it("every option explains why it works and cites research", () => {
    expect(TOUCHES.map((t) => t.id)).toEqual(["mood", "common", "note", "goal", "walk"]);
    for (const t of TOUCHES) {
      expect(t.why.length).toBeGreaterThan(20);
      expect(t.source).toMatch(/\d{4}/);
    }
  });
  it("has no em dashes in any copy", () => {
    expect(JSON.stringify({ TOUCHES, COMMON_PROMPTS })).not.toContain("—");
  });
  it("spots the same answer loosely", () => {
    expect(sameAnswer("the Seattle Seahawks!", "Seattle Seahawks")).toBe(true);
    expect(sameAnswer("seahawks", "Seattle Seahawks")).toBe(false);
    expect(sameAnswer("", "")).toBe(false);
  });
});
