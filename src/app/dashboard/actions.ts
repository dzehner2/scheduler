"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncCalendars } from "@/lib/accounts";
import { cancelBooking, getBooking } from "@/lib/booking";
import { db } from "@/lib/db";
import { isHex, RESERVED_SLUGS } from "@/lib/eventTypes";
import { requireOwner } from "@/lib/session";
import { parseHHMM, type WeeklyHours } from "@/lib/slots";

const int = (v: FormDataEntryValue | null, min: number, max: number, label: string): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  return n;
};

// ---------- Calendars and settings ----------

export async function toggleCalendar(form: FormData) {
  await requireOwner();
  const sql = await db();
  await sql`
    update calendars set check_conflicts = ${form.get("checked") === "1"}
    where account_id = ${Number(form.get("accountId"))} and google_id = ${String(form.get("googleId"))}`;
  revalidatePath("/dashboard", "layout");
}

export async function saveSettings(form: FormData) {
  await requireOwner();
  const sql = await db();
  const tz = String(form.get("time_zone") ?? "");
  if (!Intl.supportedValuesOf("timeZone").includes(tz) && tz !== "UTC") {
    redirect("/dashboard/calendars?error=Unknown+time+zone");
  }
  const [accountId, ...rest] = String(form.get("booking_calendar") ?? "").split("|");
  const calendarId = rest.join("|");
  const [cal] = await sql<{ access_role: string }[]>`
    select access_role from calendars where account_id = ${Number(accountId)} and google_id = ${calendarId}`;
  if (!cal || !["owner", "writer"].includes(cal.access_role)) {
    redirect("/dashboard/calendars?error=Pick+a+booking+calendar+you+can+edit");
  }
  await sql`
    update settings set display_name = ${String(form.get("display_name") ?? "").trim().slice(0, 120)},
      time_zone = ${tz}, booking_account_id = ${Number(accountId)}, booking_calendar_id = ${calendarId}
    where id = 1`;
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/calendars?saved=1");
}

export async function refreshCalendars(form: FormData) {
  await requireOwner();
  try {
    await syncCalendars(Number(form.get("accountId")));
  } catch (err) {
    redirect(`/dashboard/calendars?error=${encodeURIComponent(err instanceof Error ? err.message : "Refresh failed")}`);
  }
  revalidatePath("/dashboard", "layout");
}

export async function disconnectAccount(form: FormData) {
  await requireOwner();
  const sql = await db();
  const id = Number(form.get("accountId"));
  const [s] = await sql<{ booking_account_id: number | null }[]>`select booking_account_id from settings where id = 1`;
  if (s.booking_account_id === id) {
    redirect("/dashboard/calendars?error=That+account+holds+your+booking+calendar.+Pick+a+different+booking+calendar+first.");
  }
  await sql`delete from accounts where id = ${id}`;
  revalidatePath("/dashboard", "layout");
}

// ---------- Booking links (event types) ----------

export async function saveEventType(form: FormData) {
  await requireOwner();
  const sql = await db();
  const id = form.get("id") ? Number(form.get("id")) : null;
  const back = `/dashboard/event-types/${id ?? "new"}`;

  let values;
  try {
    const title = String(form.get("title") ?? "").trim();
    if (!title || title.length > 120) throw new Error("Please give the booking link a name.");
    const slug = String(form.get("slug") ?? "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(slug) || RESERVED_SLUGS.has(slug)) {
      throw new Error("The link address can use lowercase letters, numbers and dashes (2 to 49 characters).");
    }
    const weekly: WeeklyHours = {};
    for (let d = 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7; d <= 7; d++) {
      if (form.get(`day_${d}_on`) !== "on") continue;
      const start = String(form.get(`day_${d}_start`) ?? "");
      const end = String(form.get(`day_${d}_end`) ?? "");
      const s = parseHHMM(start);
      const e = parseHHMM(end);
      if (e.hour * 60 + e.minute <= s.hour * 60 + s.minute) throw new Error("Each day's end time must be after its start time.");
      weekly[d] = [{ start, end }];
    }
    if (Object.keys(weekly).length === 0) throw new Error("Choose at least one day you are available.");
    const location_type = String(form.get("location_type"));
    if (!["meet", "phone", "in_person", "custom"].includes(location_type)) throw new Error("Choose a location.");
    const capRaw = String(form.get("daily_cap") ?? "").trim();
    const theme = form.get("theme") === "brand" ? "brand" : "playdate";
    const color = (key: string, label: string) => {
      const v = String(form.get(key) ?? "").trim();
      if (theme === "brand" && !isHex(v)) throw new Error(`${label} must be a color like #117A4F.`);
      return isHex(v) ? v.toUpperCase() : "";
    };
    const logo = String(form.get("brand_logo_url") ?? "").trim();
    if (logo && (!/^https:\/\/\S+$/.test(logo) || logo.length > 500)) {
      throw new Error("The logo address must start with https://");
    }
    const brand = {
      theme,
      brand_name: String(form.get("brand_name") ?? "").trim().slice(0, 120),
      brand_primary: color("brand_primary", "Main color"),
      brand_dark: color("brand_dark", "Text color"),
      brand_bg: color("brand_bg", "Background color"),
      brand_logo_url: logo,
    };

    values = {
      title,
      slug,
      description: String(form.get("description") ?? "").trim().slice(0, 2000),
      duration_min: int(form.get("duration_min"), 5, 480, "Duration"),
      buffer_before_min: int(form.get("buffer_before_min"), 0, 240, "Buffer before"),
      buffer_after_min: int(form.get("buffer_after_min"), 0, 240, "Buffer after"),
      min_notice_min: Math.round(Number(form.get("min_notice_hours")) * 60),
      max_days_ahead: int(form.get("max_days_ahead"), 1, 365, "Days ahead"),
      slot_interval_min: int(form.get("slot_interval_min"), 5, 240, "Start time interval"),
      daily_cap: capRaw === "" ? null : int(capRaw, 1, 50, "Daily limit"),
      weekly_hours: sql.json(weekly as never),
      location_type,
      location_detail: String(form.get("location_detail") ?? "").trim().slice(0, 500),
      active: form.get("active") === "on",
      ...brand,
    };
    if (!Number.isFinite(values.min_notice_min) || values.min_notice_min < 0 || values.min_notice_min > 60 * 24 * 30) {
      throw new Error("Minimum notice must be between 0 and 720 hours.");
    }
  } catch (err) {
    redirect(`${back}?error=${encodeURIComponent(err instanceof Error ? err.message : "Invalid input")}`);
  }

  try {
    if (id) {
      await sql`update event_types set ${sql(values)} where id = ${id}`;
    } else {
      await sql`insert into event_types ${sql(values)}`;
    }
  } catch (err) {
    const code = (err as { code?: string }).code;
    const msg = code === "23505" ? "Another booking link already uses that address." : "Could not save.";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/dashboard/event-types");
  redirect("/dashboard/event-types?saved=1");
}

export async function deleteEventType(form: FormData) {
  await requireOwner();
  const sql = await db();
  await sql`delete from event_types where id = ${Number(form.get("id"))}`;
  revalidatePath("/dashboard/event-types");
  redirect("/dashboard/event-types");
}

// ---------- Bookings ----------

export async function cancelBookingAction(form: FormData) {
  await requireOwner();
  const b = await getBooking(String(form.get("id")));
  if (b) {
    try {
      await cancelBooking(b);
    } catch (err) {
      redirect(`/dashboard?error=${encodeURIComponent(err instanceof Error ? err.message : "Cancel failed")}`);
    }
  }
  revalidatePath("/dashboard");
}

// ---------- Waitlist ----------

export async function removeWaitlistEntry(form: FormData) {
  await requireOwner();
  const sql = await db();
  await sql`delete from waitlist where id = ${Number(form.get("id"))}`;
  revalidatePath("/dashboard/waitlist");
}
