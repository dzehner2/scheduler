import { describe, expect, it } from "vitest";
import { ASSUMPTIONS, footprintOf, monthsLive, roundUpToTrees, totalKwh, usageKwh, userShareKwh } from "../src/lib/footprint";

describe("footprint", () => {
  it("converts usage to energy", () => {
    // 1000 page views of 0.5 MB = 0.5 GB * 0.81 kWh/GB
    expect(usageKwh({ pageViews: 1000, apiCalls: 0 })).toBeCloseTo(0.405, 5);
  });
  it("turns energy into carbon and a suggested donation", () => {
    const f = footprintOf(10); // 10 kWh * 0.48 = 4.8 kg; 0.0048 t * $190 = $0.912
    expect(f.kgCo2).toBeCloseTo(4.8, 5);
    expect(f.cents).toBe(91);
  });
  it("splits shared build and hosting evenly across users", () => {
    const solo = userShareKwh({ pageViews: 0, apiCalls: 0 }, 1, 1);
    const shared = userShareKwh({ pageViews: 0, apiCalls: 0 }, 4, 1);
    expect(solo).toBeCloseTo(ASSUMPTIONS.buildKwh + ASSUMPTIONS.baselineKwhPerMonth, 5);
    expect(shared).toBeCloseTo(solo / 4, 5);
  });
  it("user shares add up to the total", () => {
    const users = [{ pageViews: 100, apiCalls: 400 }, { pageViews: 30, apiCalls: 90 }, { pageViews: 0, apiCalls: 0 }];
    const sum = users.reduce((s, u) => s + userShareKwh(u, users.length, 3), 0);
    const all = { pageViews: 130, apiCalls: 490 };
    expect(sum).toBeCloseTo(totalKwh(all, 3), 6);
  });
  it("rounds up to at least one tree", () => {
    expect(roundUpToTrees(3)).toEqual({ trees: 1, dollars: 1 });
    expect(roundUpToTrees(250)).toEqual({ trees: 3, dollars: 3 });
  });
  it("counts at least one month live", () => {
    const now = new Date("2026-11-18T00:00:00Z");
    expect(monthsLive(new Date("2026-11-17T00:00:00Z"), now)).toBe(1);
    expect(monthsLive(new Date("2026-08-01T00:00:00Z"), now)).toBe(4);
  });
});
