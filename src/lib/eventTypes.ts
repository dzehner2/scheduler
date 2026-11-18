import { config } from "./config";
import { db } from "./db";
import type { SlotRules, WeeklyHours } from "./slots";

export type LocationType = "meet" | "phone" | "in_person" | "custom";

export interface EventType {
  id: number;
  user_id: number;
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
  /** null = use the default booking calendar from settings */
  booking_account_id: number | null;
  booking_calendar_id: string | null;
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
  vibe: string;
  favorite_show: string;
  time_zone: string;
  booking_account_id: number | null;
  booking_calendar_id: string | null;
}

export const RESERVED_SLUGS = new Set(["api", "dashboard", "login", "booking", "privacy", "terms", "signup", "_next", "favicon.ico"]);

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

const DEFAULT_SETTINGS: Settings = {
  display_name: "",
  vibe: "mall",
  favorite_show: "",
  time_zone: "America/Los_Angeles",
  booking_account_id: null,
  booking_calendar_id: null,
};

/** A user's own settings (name, time zone, default booking calendar). */
export async function getSettings(userId: number): Promise<Settings> {
  const sql = await db();
  const [s] = await sql<Settings[]>`
    select display_name, vibe, favorite_show, time_zone, booking_account_id, booking_calendar_id
    from user_settings where user_id = ${userId}`;
  return s ?? DEFAULT_SETTINGS;
}

/**
 * A public booking link. `handle` null means the primary owner's links at the
 * site root (/intro); otherwise /handle/intro.
 */
export async function getEventTypeBySlug(handle: string | null, slug: string): Promise<(EventType & { owner_handle: string | null }) | null> {
  const sql = await db();
  const [t] = handle
    ? await sql<(EventType & { owner_handle: string | null })[]>`
        select e.*, u.handle as owner_handle from event_types e join users u on u.id = e.user_id
        where u.handle = ${handle} and e.slug = ${slug}`
    : await sql<(EventType & { owner_handle: string | null })[]>`
        select e.*, u.handle as owner_handle from event_types e join users u on u.id = e.user_id
        where u.email = ${config.ownerEmails[0] ?? ""} and e.slug = ${slug}`;
  return t ?? null;
}

/** By id. Pass userId to only return the link if that user owns it. */
export async function getEventType(id: number, userId?: number): Promise<EventType | null> {
  if (!Number.isInteger(id)) return null;
  const sql = await db();
  const [t] =
    userId === undefined
      ? await sql<EventType[]>`select * from event_types where id = ${id}`
      : await sql<EventType[]>`select * from event_types where id = ${id} and user_id = ${userId}`;
  return t ?? null;
}

export async function listEventTypes(userId: number): Promise<EventType[]> {
  const sql = await db();
  return sql<EventType[]>`select * from event_types where user_id = ${userId} order by active desc, title`;
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
