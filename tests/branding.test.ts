import { describe, expect, it } from "vitest";
import { brandingFor, brandStyle, readableOn, type EventType } from "../src/lib/eventTypes";

const base = { theme: "brand", brand_name: "Acme", brand_primary: "#117A4F", brand_dark: "#1F2D3D", brand_bg: "#F2F6F2", brand_logo_url: "" } as unknown as EventType;

describe("branding", () => {
  it("picks readable text on brand colors", () => {
    expect(readableOn("#117A4F")).toBe("#ffffff"); // CedarStone green
    expect(readableOn("#1F2D3D")).toBe("#ffffff"); // navy
    expect(readableOn("#FFC926")).toBe("#111111"); // yellow
    expect(readableOn("#F2F6F2")).toBe("#111111");
  });
  it("sets CSS variables only for branded links", () => {
    expect(brandStyle(brandingFor(base))["--brand-primary"]).toBe("#117A4F");
    expect(brandStyle(brandingFor({ ...base, theme: "playdate" }))).toEqual({});
  });
  it("ignores bad colors and non-https logos", () => {
    const b = brandingFor({ ...base, brand_primary: "red;}", brand_logo_url: "javascript:alert(1)" });
    expect(b.primary).toBe("#1F6FEB");
    expect(b.logoUrl).toBe("");
  });
});
