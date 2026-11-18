import { describe, expect, it } from "vitest";
import { isVibe, matchVibe, VIBES, VIBE_IDS } from "../src/lib/vibes";

describe("matchVibe", () => {
  it("maps favorite shows to vibes", () => {
    expect(matchVibe("DarkWing Duck")).toBe("night-patrol");
    expect(matchVibe("Teenage Mutant Ninja Turtles")).toBe("saturday");
    expect(matchVibe("knight rider")).toBe("neon-drive");
    expect(matchVibe("Saved by the Bell!")).toBe("mall");
    expect(matchVibe("The Fresh Prince of Bel-Air")).toBe("sitcom");
    expect(matchVibe("Star Trek: The Next Generation")).toBe("space");
    expect(matchVibe("DuckTales")).toBe("saturday");
  });
  it("returns null when nothing matches", () => {
    expect(matchVibe("Some obscure local show")).toBeNull();
    expect(matchVibe("")).toBeNull();
    expect(matchVibe(" ")).toBeNull();
  });
});

describe("vibe library", () => {
  it("never names a show, character or catchphrase in guest-facing copy", () => {
    const banned = /darkwing|duck|batman|turtle|knight rider|kitt|bel-air|saved by|trek|dangerous|cowabunga/i;
    for (const id of VIBE_IDS) {
      const v = VIBES[id];
      expect(`${v.tagline} ${v.pick} ${v.done} ${v.name}`).not.toMatch(banned);
    }
  });
  it("has no em dashes in any copy", () => {
    for (const id of VIBE_IDS) expect(JSON.stringify(VIBES[id])).not.toContain("—");
  });
  it("validates ids", () => {
    expect(isVibe("night-patrol")).toBe(true);
    expect(isVibe("<script>")).toBe(false);
  });
});
