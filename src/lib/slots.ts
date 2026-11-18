import { DateTime } from "luxon";

/** A time range in epoch milliseconds (UTC). `end` is exclusive. */
export interface Interval {
  start: number;
  end: number;
}

export interface TimeWindow {
  /** "HH:MM" in 24 hour time, local to the owner's time zone. */
  start: string;
  /** "HH:MM", may be "24:00" for end of day. */
  end: string;
}

/** Keyed by ISO weekday: 1 = Monday ... 7 = Sunday. */
export type WeeklyHours = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, TimeWindow[]>>;

export interface SlotRules {
  durationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minNoticeMin: number;
  maxDaysAhead: number;
  slotIntervalMin: number;
  /** Max bookings of this type per local day. null = no cap. */
  dailyCap: number | null;
  weeklyHours: WeeklyHours;
}

export interface SlotQuery {
  rules: SlotRules;
  /** Owner's IANA time zone, e.g. "America/Los_Angeles". */
  timeZone: string;
  rangeStart: number;
  rangeEnd: number;
  now: number;
  /** Busy time from every calendar that counts, plus confirmed bookings. */
  busy: Interval[];
  /** Start times of confirmed bookings of THIS event type (for the daily cap). */
  sameTypeBookingStarts: number[];
}

const MIN = 60_000;

export function parseHHMM(value: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) throw new Error(`Invalid time "${value}"`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) {
    throw new Error(`Invalid time "${value}"`);
  }
  return { hour, minute };
}

function localTime(day: DateTime, value: string): DateTime {
  const { hour, minute } = parseHHMM(value);
  if (hour === 24) return day.plus({ days: 1 }).startOf("day");
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

/** Sort and merge overlapping or touching intervals. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) {
      last.end = Math.max(last.end, i.end);
    } else {
      out.push({ ...i });
    }
  }
  return out;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Returns available slot start times (epoch ms, ascending) inside
 * [rangeStart, rangeEnd). A slot is offered only if the meeting plus its
 * buffers does not touch any busy interval.
 */
export function generateSlots(q: SlotQuery): number[] {
  const { rules, timeZone } = q;
  if (rules.durationMin <= 0 || rules.slotIntervalMin <= 0) return [];

  const busy = mergeIntervals(q.busy);
  const earliest = Math.max(q.rangeStart, q.now + rules.minNoticeMin * MIN);
  const horizon = DateTime.fromMillis(q.now, { zone: timeZone })
    .startOf("day")
    .plus({ days: rules.maxDaysAhead + 1 })
    .toMillis();
  const latest = Math.min(q.rangeEnd, horizon);
  if (earliest >= latest) return [];

  const bookingsPerDay = new Map<string, number>();
  for (const s of q.sameTypeBookingStarts) {
    const key = DateTime.fromMillis(s, { zone: timeZone }).toISODate()!;
    bookingsPerDay.set(key, (bookingsPerDay.get(key) ?? 0) + 1);
  }

  const slots: number[] = [];
  // Start one day early so windows that cross midnight are not missed.
  let day = DateTime.fromMillis(earliest, { zone: timeZone }).startOf("day").minus({ days: 1 });
  const lastDay = DateTime.fromMillis(latest, { zone: timeZone }).startOf("day");

  while (day <= lastDay) {
    const dayKey = day.toISODate()!;
    const capReached =
      rules.dailyCap !== null && (bookingsPerDay.get(dayKey) ?? 0) >= rules.dailyCap;
    const windows = rules.weeklyHours[day.weekday as 1] ?? [];

    if (!capReached) {
      for (const w of windows) {
        const winStart = localTime(day, w.start).toMillis();
        const winEnd = localTime(day, w.end).toMillis();
        for (
          let start = winStart;
          start + rules.durationMin * MIN <= winEnd;
          start += rules.slotIntervalMin * MIN
        ) {
          if (start < earliest || start >= latest) continue;
          const end = start + rules.durationMin * MIN;
          const blocked: Interval = {
            start: start - rules.bufferBeforeMin * MIN,
            end: end + rules.bufferAfterMin * MIN,
          };
          if (!busy.some((b) => overlaps(b, blocked))) slots.push(start);
        }
      }
    }
    day = day.plus({ days: 1 });
  }

  return [...new Set(slots)].sort((a, b) => a - b);
}

/** Interval that must be free (including buffers) to book a slot at `start`. */
export function blockedRange(rules: SlotRules, start: number): Interval {
  return {
    start: start - rules.bufferBeforeMin * MIN,
    end: start + (rules.durationMin + rules.bufferAfterMin) * MIN,
  };
}

/** Check a single requested start time against the same rules used to list slots. */
export function isSlotAvailable(q: Omit<SlotQuery, "rangeStart" | "rangeEnd">, start: number): boolean {
  return generateSlots({ ...q, rangeStart: start, rangeEnd: start + 1 }).includes(start);
}
