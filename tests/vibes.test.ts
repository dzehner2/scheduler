import { describe, expect, it } from "vitest";
import { isVibe, matchVibe, VIBES, VIBE_IDS } from "../src/lib/vibes";

describe("matchVibe", () => {
  it("maps favorite shows to vibes", () => {
    expect(matchVibe("DarkWing Duck")).toBe("night-patrol");
    expect(matchVibe("Teenage Mutant Ninja Turtles")).toBe("saturday");
    expect(matchVibe("knight rider")).toBe("neon-drive");
    expect(matchVibe("Saved by the Bell!")).toBe("mall");
    expect(matchVibe("The Fresh Prince of Bel-Air")).toBe("block-party");
    expect(matchVibe("Full House")).toBe("sitcom");
    expect(matchVibe("The X-Files")).toBe("case-files");
    expect(matchVibe("Goosebumps")).toBe("creature-feature");
    expect(matchVibe("Miami Vice")).toBe("pastel-vice");
    expect(matchVibe("She-Ra: Princess of Power")).toBe("castle-quest");
    expect(matchVibe("Rugrats")).toBe("slime-time");
    expect(matchVibe("Baywatch")).toBe("beach-day");
    expect(matchVibe("Mister Rogers' Neighborhood")).toBe("neighborhood");
    expect(matchVibe("Bill Nye the Science Guy")).toBe("science-lab");
    expect(matchVibe("Captain N: The Game Master")).toBe("arcade");
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
  it("has at least 16 vibes, each with a matching font, pattern and safe colors", async () => {
    const { contrast, safeColors, FONTS, PATTERNS } = await import("../src/lib/vibeKit");
    expect(VIBE_IDS.length).toBeGreaterThanOrEqual(16);
    for (const id of VIBE_IDS) {
      const s = VIBES[id].spec;
      if (!s) continue;
      expect(FONTS[s.font]).toBeTruthy();
      expect(PATTERNS[s.pattern]).toBeTruthy();
      const c = safeColors(s.colors);
      expect(contrast(c.ink, "#ffffff")).toBeGreaterThanOrEqual(7);
      expect(contrast(c.link, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.led, c.ledBg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("never names a show, character or catchphrase in guest-facing copy", () => {
    const banned = /darkwing|duck|batman|turtle|knight rider|kitt|bel-air|saved by|trek|dangerous|cowabunga|truth is|it's alive|be my neighbor|be my visitor/i;
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
