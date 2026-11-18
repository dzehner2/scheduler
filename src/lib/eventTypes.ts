import { db } from "./db";
import type { SlotRules, WeeklyHours } from "./slots";

export type LocationType = "meet" | "phone" | "in_person" | "custom";

export interface EventType {
  id: number;
  slug: string;
  title: string;
  description: string;
  duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  min_notice_min: number;
  max_days_ahead: number;
  slot_interval_min: number;
  daily_cap: number | null;
  weekly_hours: WeeklyHours;
  location_type: LocationType;
  location_detail: string;
  active: boolean;
}

export interface Settings {
  display_name: string;
  time_zone: string;
  booking_account_id: number | null;
  booking_calendar_id: string | null;
}

export const RESERVED_SLUGS = new Set(["api", "dashboard", "login", "booking", "privacy", "terms", "_next", "favicon.ico"]);

export function rulesFor(t: EventType): SlotRules {
  return {
    durationMin: t.duration_min,
    bufferBeforeMin: t.buffer_before_min,
    bufferAfterMin: t.buffer_after_min,
    minNoticeMin: t.min_notice_min,
    maxDaysAhead: t.max_days_ahead,
    slotIntervalMin: t.slot_interval_min,
    dailyCap: t.daily_cap,
    weeklyHours: t.weekly_hours,
  };
}

export async function getSettings(): Promise<Settings> {
  const sql = await db();
  const [s] = await sql<Settings[]>`select display_name, time_zone, booking_account_id, booking_calendar_id from settings where id = 1`;
  return s;
}

export async function getEventTypeBySlug(slug: string): Promise<EventType | null> {
  const sql = await db();
  const [t] = await sql<EventType[]>`select * from event_types where slug = ${slug}`;
  return t ?? null;
}

export async function getEventType(id: number): Promise<EventType | null> {
  const sql = await db();
  const [t] = await sql<EventType[]>`select * from event_types where id = ${id}`;
  return t ?? null;
}

export async function listEventTypes(): Promise<EventType[]> {
  const sql = await db();
  return sql<EventType[]>`select * from event_types order by active desc, title`;
}

export function locationLabel(t: Pick<EventType, "location_type" | "location_detail">): string {
  switch (t.location_type) {
    case "meet":
      return "Google Meet";
    case "phone":
      return "Phone call";
    case "in_person":
      return t.location_detail ? `In person: ${t.location_detail}` : "In person";
    case "custom":
      return t.location_detail || "Details in invite";
  }
}
