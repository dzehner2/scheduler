import { describe, expect, it } from "vitest";
import { cleanCopy, showKey, toSpec } from "../src/lib/vibeDesigner";
import { contrast, safeColors, specStyle } from "../src/lib/vibeKit";

const flawed = {
  name: "Pinwheel Parade",
  blurb: "Candy stripes and a bouncy marquee.",
  tagline: "Step right up — pick a time!",
  pick: "Pick a time",
  done: "Ta-da! You're booked.",
  font: "luckiest-guy" as const,
  pattern: "stripes" as const,
  radius: 99,
  colors: { pageBg: "#fff0d6", softBg: "#fff8ec", ink: "#cccccc", accent: "#e63946", accent2: "#2a9d8f", accent3: "#f4a261", link: "#e9c46a", led: "#f4a261", ledBg: "#f9f9f9", navBg: "not-a-color" },
};

describe("vibe designer safety", () => {
  it("never lets the show's name into guest-facing copy", () => {
    const s = toSpec(flawed, "Pinwheel Pals");
    expect(s.name).toBe("Candy Stripes"); // named after its look, not the show
    expect(JSON.stringify(s)).not.toMatch(/pinwheel/i);
  });
  it("removes em dashes and clamps values", () => {
    const s = toSpec(flawed, "Pinwheel Pals");
    expect(s.tagline).toBe("Step right up, pick a time!");
    expect(s.radius).toBe(16);
    expect(s.colors.navBg).toBe("#1d1238"); // invalid color replaced
  });
  it("makes any palette readable", () => {
    const c = safeColors(toSpec(flawed, "Pinwheel Pals").colors);
    expect(contrast(c.ink, "#ffffff")).toBeGreaterThanOrEqual(7);
    expect(contrast(c.link, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.led, c.ledBg)).toBeGreaterThanOrEqual(4.5);
  });
  it("only ever emits hex colors and known fonts into CSS", () => {
    const style = specStyle(toSpec({ ...flawed, font: "evil;}" as never, colors: { ...flawed.colors, accent: "red;}body{x:y" } }, "x"));
    for (const [k, v] of Object.entries(style)) {
      if (k.startsWith("--page-pattern") || k === "--info-pattern") continue;
      expect(v).not.toMatch(/[;{}]/);
    }
  });
  it("normalizes show names for caching", () => {
    expect(showKey("The Pinwheel Pals!")).toBe(showKey("pinwheel pals"));
  });
  it("cleanCopy falls back on overlong text", () => {
    expect(cleanCopy("x".repeat(200), "show", 40, "Pick a time")).toBe("Pick a time");
  });
});
