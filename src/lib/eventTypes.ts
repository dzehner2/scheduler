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
  theme: Theme;
  brand_name: string;
  brand_primary: string;
  brand_dark: string;
  brand_bg: string;
  brand_logo_url: string;
}

export type Theme = "playdate" | "brand";

export interface Branding {
  theme: Theme;
  name: string;
  primary: string;
  dark: string;
  bg: string;
  logoUrl: string;
}

export const BRAND_PRESETS: Record<string, Omit<Branding, "theme" | "logoUrl">> = {
  CedarStone: { name: "CedarStone Design & Build", primary: "#117A4F", dark: "#1F2D3D", bg: "#F2F6F2" },
};

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: string) => HEX.test(v);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black, whichever reads better on the given background color. */
export function readableOn(hex: string): string {
  if (!isHex(hex)) return "#ffffff";
  const l = luminance(hex);
  return (1.05 / (l + 0.05)) >= ((l + 0.05) / 0.0625) ? "#ffffff" : "#111111";
}

export function brandingFor(t: EventType): Branding {
  return {
    theme: t.theme === "brand" ? "brand" : "playdate",
    name: t.brand_name,
    primary: isHex(t.brand_primary) ? t.brand_primary : "#1F6FEB",
    dark: isHex(t.brand_dark) ? t.brand_dark : "#1C2430",
    bg: isHex(t.brand_bg) ? t.brand_bg : "#F6F7F9",
    logoUrl: /^https:\/\//.test(t.brand_logo_url) ? t.brand_logo_url : "",
  };
}

/** CSS custom properties for a branded page. Empty for the PlayDate look. */
export function brandStyle(b: Branding): Record<string, string> {
  if (b.theme !== "brand") return {};
  return {
    "--brand-primary": b.primary,
    "--brand-on-primary": readableOn(b.primary),
    "--brand-dark": b.dark,
    "--brand-bg": b.bg,
  };
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
