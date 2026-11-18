import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { generateSlots, isSlotAvailable, mergeIntervals, type SlotRules } from "../src/lib/slots";

const TZ = "America/Los_Angeles";
const at = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toMillis();
const fmt = (ms: number) => DateTime.fromMillis(ms, { zone: TZ }).toFormat("yyyy-MM-dd HH:mm");

const weekdays9to5 = { start: "09:00", end: "17:00" };
const rules = (over: Partial<SlotRules> = {}): SlotRules => ({
  durationMin: 30,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  minNoticeMin: 0,
  maxDaysAhead: 60,
  slotIntervalMin: 30,
  dailyCap: null,
  weeklyHours: { 1: [weekdays9to5], 2: [weekdays9to5], 3: [weekdays9to5], 4: [weekdays9to5], 5: [weekdays9to5] },
  ...over,
});

// Monday 2026-11-23
const MONDAY = "2026-11-23";
const day = (d: string, over: Partial<SlotRules> = {}, busy: [string, string][] = [], extra = {}) =>
  generateSlots({
    rules: rules(over),
    timeZone: TZ,
    rangeStart: at(`${d}T00:00`),
    rangeEnd: at(`${d}T00:00`) + 24 * 3600_000,
    now: at("2026-11-20T08:00"),
    busy: busy.map(([s, e]) => ({ start: at(s), end: at(e) })),
    sameTypeBookingStarts: [],
    ...extra,
  }).map(fmt);

describe("generateSlots", () => {
  it("offers every interval inside working hours", () => {
    const slots = day(MONDAY);
    expect(slots[0]).toBe("2026-11-23 09:00");
    expect(slots.at(-1)).toBe("2026-11-23 16:30");
    expect(slots).toHaveLength(16);
  });

  it("offers nothing on days without hours", () => {
    expect(day("2026-11-22")).toEqual([]); // Sunday
  });

  it("removes slots that overlap busy time from any calendar", () => {
    const slots = day(MONDAY, {}, [
      ["2026-11-23T10:00", "2026-11-23T11:00"], // work calendar
      ["2026-11-23T13:15", "2026-11-23T13:45"], // personal calendar
    ]);
    expect(slots).not.toContain("2026-11-23 10:00");
    expect(slots).not.toContain("2026-11-23 10:30");
    expect(slots).toContain("2026-11-23 11:00");
    expect(slots).not.toContain("2026-11-23 13:00");
    expect(slots).not.toContain("2026-11-23 13:30");
    expect(slots).toContain("2026-11-23 14:00");
  });

  it("treats a meeting that ends exactly at slot start as free", () => {
    const slots = day(MONDAY, {}, [["2026-11-23T09:00", "2026-11-23T09:30"]]);
    expect(slots[0]).toBe("2026-11-23 09:30");
  });

  it("applies buffers before and after", () => {
    const slots = day(MONDAY, { bufferBeforeMin: 15, bufferAfterMin: 15 }, [
      ["2026-11-23T12:00", "2026-11-23T13:00"],
    ]);
    expect(slots).not.toContain("2026-11-23 11:30"); // would end 12:00 + 15 min buffer
    expect(slots).toContain("2026-11-23 11:00");
    expect(slots).not.toContain("2026-11-23 13:00"); // needs 15 min before
    expect(slots).toContain("2026-11-23 13:30");
  });

  it("respects minimum notice", () => {
    const slots = generateSlots({
      rules: rules({ minNoticeMin: 120 }),
      timeZone: TZ,
      rangeStart: at(`${MONDAY}T00:00`),
      rangeEnd: at(`${MONDAY}T23:59`),
      now: at(`${MONDAY}T10:10`),
      busy: [],
      sameTypeBookingStarts: [],
    }).map(fmt);
    expect(slots[0]).toBe("2026-11-23 12:30");
  });

  it("stops at the max days ahead horizon", () => {
    const slots = generateSlots({
      rules: rules({ maxDaysAhead: 3 }),
      timeZone: TZ,
      rangeStart: at("2026-11-20T00:00"),
      rangeEnd: at("2026-12-20T00:00"),
      now: at("2026-11-20T08:00"), // Friday
      busy: [],
      sameTypeBookingStarts: [],
    }).map(fmt);
    expect(slots.some((s) => s.startsWith("2026-11-23"))).toBe(true); // Monday = day 3
    expect(slots.some((s) => s.startsWith("2026-11-24"))).toBe(false);
  });

  it("enforces the daily cap per event type", () => {
    const capped = day(MONDAY, { dailyCap: 2 }, [], {
      sameTypeBookingStarts: [at(`${MONDAY}T09:00`), at(`${MONDAY}T15:00`)],
    });
    expect(capped).toEqual([]);
    const notYet = day(MONDAY, { dailyCap: 3 }, [], { sameTypeBookingStarts: [at(`${MONDAY}T09:00`)] });
    expect(notYet.length).toBeGreaterThan(0);
  });

  it("supports split windows (lunch break)", () => {
    const slots = day(MONDAY, {
      weeklyHours: { 1: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "15:00" }] },
    });
    expect(slots).toContain("2026-11-23 11:30");
    expect(slots).not.toContain("2026-11-23 12:00");
    expect(slots).not.toContain("2026-11-23 12:30");
    expect(slots).toContain("2026-11-23 13:00");
  });

  it("does not offer a slot that would run past the end of the window", () => {
    const slots = day(MONDAY, { durationMin: 60 });
    expect(slots.at(-1)).toBe("2026-11-23 16:00");
  });

  it("keeps wall-clock hours across the DST change", () => {
    // 2026-11-01 is the fall-back Sunday; check the following Monday 2026-11-02 and the
    // Monday before, 2026-10-26. Both should start 09:00 local.
    const before = generateSlots({
      rules: rules(),
      timeZone: TZ,
      rangeStart: at("2026-10-26T00:00"),
      rangeEnd: at("2026-11-03T00:00"),
      now: at("2026-10-20T00:00"),
      busy: [],
      sameTypeBookingStarts: [],
    });
    const mondays = before.map(fmt).filter((s) => s.endsWith("09:00"));
    expect(mondays).toContain("2026-10-26 09:00");
    expect(mondays).toContain("2026-11-02 09:00");
    // 9am PDT = 16:00 UTC, 9am PST = 17:00 UTC
    expect(new Date(at("2026-10-26T09:00")).getUTCHours()).toBe(16);
    expect(new Date(at("2026-11-02T09:00")).getUTCHours()).toBe(17);
  });

  it("works for owners in other time zones", () => {
    const slots = generateSlots({
      rules: rules(),
      timeZone: "America/New_York",
      rangeStart: Date.UTC(2026, 10, 23),
      rangeEnd: Date.UTC(2026, 10, 24),
      now: Date.UTC(2026, 10, 20),
      busy: [],
      sameTypeBookingStarts: [],
    });
    expect(new Date(slots[0]).toISOString()).toBe("2026-11-23T14:00:00.000Z"); // 9am EST
  });

  it("returns nothing for an all-day busy block", () => {
    expect(day(MONDAY, {}, [[`${MONDAY}T00:00`, "2026-11-24T00:00"]])).toEqual([]);
  });
});

describe("isSlotAvailable", () => {
  const base = {
    rules: rules(),
    timeZone: TZ,
    now: at("2026-11-20T08:00"),
    sameTypeBookingStarts: [],
  };
  it("accepts a listed slot", () => {
    expect(isSlotAvailable({ ...base, busy: [] }, at(`${MONDAY}T10:00`))).toBe(true);
  });
  it("rejects a slot that became busy since the page loaded", () => {
    const busy = [{ start: at(`${MONDAY}T10:00`), end: at(`${MONDAY}T10:30`) }];
    expect(isSlotAvailable({ ...base, busy }, at(`${MONDAY}T10:00`))).toBe(false);
  });
  it("rejects off-grid and out-of-hours times", () => {
    expect(isSlotAvailable({ ...base, busy: [] }, at(`${MONDAY}T10:10`))).toBe(false);
    expect(isSlotAvailable({ ...base, busy: [] }, at(`${MONDAY}T18:00`))).toBe(false);
  });
});

describe("mergeIntervals", () => {
  it("merges overlapping and touching ranges", () => {
    expect(
      mergeIntervals([
        { start: 5, end: 8 },
        { start: 1, end: 3 },
        { start: 3, end: 4 },
        { start: 7, end: 10 },
      ]),
    ).toEqual([
      { start: 1, end: 4 },
      { start: 5, end: 10 },
    ]);
  });
});
