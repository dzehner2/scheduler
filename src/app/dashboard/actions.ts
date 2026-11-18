"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ownsAccount, syncCalendars } from "@/lib/accounts";
import { cancelBooking, getBooking } from "@/lib/booking";
import { db } from "@/lib/db";
import { isHex, RESERVED_SLUGS } from "@/lib/eventTypes";
import { endSession, requireAdmin, requireUser } from "@/lib/session";
import { validHandle } from "@/lib/users";
import { isVibe, matchVibe } from "@/lib/vibes";
import { todayFor } from "@/lib/checkins";
import { isScale } from "@/lib/wellbeing";
import { parseHHMM, type WeeklyHours } from "@/lib/slots";

const int = (v: FormDataEntryValue | null, min: number, max: number, label: string): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  return n;
};

// ---------- Calendars and settings ----------

export async function toggleCalendar(form: FormData) {
  const me = await requireUser();
  const sql = await db();
  await sql`
    update calendars set check_conflicts = ${form.get("checked") === "1"}
    where account_id = ${Number(form.get("accountId"))} and google_id = ${String(form.get("googleId"))}
      and account_id in (select id from accounts where user_id = ${me.id})`;
  revalidatePath("/dashboard", "layout");
}

export async function saveSettings(form: FormData) {
  const me = await requireUser();
  const sql = await db();
  const tz = String(form.get("time_zone") ?? "");
  if (!Intl.supportedValuesOf("timeZone").includes(tz) && tz !== "UTC") {
    redirect("/dashboard/calendars?error=Unknown+time+zone");
  }
  const [accountId, ...rest] = String(form.get("booking_calendar") ?? "").split("|");
  const calendarId = rest.join("|");
  const [cal] = await sql<{ access_role: string }[]>`
    select c.access_role from calendars c join accounts a on a.id = c.account_id
    where c.account_id = ${Number(accountId)} and c.google_id = ${calendarId} and a.user_id = ${me.id}`;
  if (!cal || !["owner", "writer"].includes(cal.access_role)) {
    redirect("/dashboard/calendars?error=Pick+a+booking+calendar+you+can+edit");
  }
  const name = String(form.get("display_name") ?? "").trim().slice(0, 120);
  await sql`
    insert into user_settings (user_id, display_name, time_zone, booking_account_id, booking_calendar_id)
    values (${me.id}, ${name}, ${tz}, ${Number(accountId)}, ${calendarId})
    on conflict (user_id) do update set display_name = excluded.display_name, time_zone = excluded.time_zone,
      booking_account_id = excluded.booking_account_id, booking_calendar_id = excluded.booking_calendar_id`;
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/calendars?saved=1");
}

export async function refreshCalendars(form: FormData) {
  const me = await requireUser();
  const accountId = Number(form.get("accountId"));
  if (!(await ownsAccount(me.id, accountId))) return;
  try {
    await syncCalendars(accountId);
  } catch (err) {
    redirect(`/dashboard/calendars?error=${encodeURIComponent(err instanceof Error ? err.message : "Refresh failed")}`);
  }
  revalidatePath("/dashboard", "layout");
}

export async function disconnectAccount(form: FormData) {
  const me = await requireUser();
  const sql = await db();
  const id = Number(form.get("accountId"));
  if (!(await ownsAccount(me.id, id))) return;
  const [s] = await sql<{ booking_account_id: number | null }[]>`select booking_account_id from user_settings where user_id = ${me.id}`;
  if (s?.booking_account_id === id) {
    redirect("/dashboard/calendars?error=That+account+holds+your+booking+calendar.+Pick+a+different+booking+calendar+first.");
  }
  const links = await sql<{ title: string }[]>`select title from event_types where booking_account_id = ${id} and user_id = ${me.id}`;
  if (links.length) {
    const names = links.map((l) => l.title).join(", ");
    redirect(`/dashboard/calendars?error=${encodeURIComponent(`That account holds the booking calendar for: ${names}. Change those links first.`)}`);
  }
  await sql`delete from accounts where id = ${id} and user_id = ${me.id}`;
  revalidatePath("/dashboard", "layout");
}

// ---------- Booking links (event types) ----------

export async function saveEventType(form: FormData) {
  const me = await requireUser();
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
    const target = String(form.get("booking_calendar") ?? "");
    let booking_account_id: number | null = null;
    let booking_calendar_id: string | null = null;
    if (target) {
      const [acct, ...rest] = target.split("|");
      const [cal] = await sql<{ access_role: string }[]>`
        select c.access_role from calendars c join accounts a on a.id = c.account_id
        where c.account_id = ${Number(acct)} and c.google_id = ${rest.join("|")} and a.user_id = ${me.id}`;
      if (!cal || !["owner", "writer"].includes(cal.access_role)) throw new Error("Pick a booking calendar you can edit.");
      booking_account_id = Number(acct);
      booking_calendar_id = rest.join("|");
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
      booking_account_id,
      booking_calendar_id,
    };
    if (!Number.isFinite(values.min_notice_min) || values.min_notice_min < 0 || values.min_notice_min > 60 * 24 * 30) {
      throw new Error("Minimum notice must be between 0 and 720 hours.");
    }
  } catch (err) {
    redirect(`${back}?error=${encodeURIComponent(err instanceof Error ? err.message : "Invalid input")}`);
  }

  try {
    if (id) {
      const updated = await sql`update event_types set ${sql(values)} where id = ${id} and user_id = ${me.id}`;
      if (updated.count === 0) throw new Error("not found");
    } else {
      await sql`insert into event_types ${sql({ ...values, user_id: me.id })}`;
    }
  } catch (err) {
    const code = (err as { code?: string }).code;
    const msg = code === "23505" ? "You already have a booking link at that address." : "Could not save.";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/dashboard/event-types");
  redirect("/dashboard/event-types?saved=1");
}

export async function deleteEventType(form: FormData) {
  const me = await requireUser();
  const sql = await db();
  await sql`delete from event_types where id = ${Number(form.get("id"))} and user_id = ${me.id}`;
  revalidatePath("/dashboard/event-types");
  redirect("/dashboard/event-types");
}

// ---------- Bookings ----------

export async function cancelBookingAction(form: FormData) {
  const me = await requireUser();
  const b = await getBooking(String(form.get("id")));
  if (b && b.user_id === me.id) {
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
  await requireAdmin();
  const sql = await db();
  await sql`delete from waitlist where id = ${Number(form.get("id"))}`;
  revalidatePath("/dashboard/waitlist");
}

// ---------- Your address (handle) ----------

export async function saveHandle(form: FormData) {
  const me = await requireUser();
  const handle = String(form.get("handle") ?? "").trim().toLowerCase();
  if (!validHandle(handle)) {
    redirect("/dashboard/calendars?error=" + encodeURIComponent("Your address can use lowercase letters, numbers and dashes (2 to 31 characters)."));
  }
  const sql = await db();
  try {
    await sql`update users set handle = ${handle} where id = ${me.id}`;
  } catch {
    redirect("/dashboard/calendars?error=" + encodeURIComponent("That address is taken. Try another."));
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/calendars?saved=1");
}

// ---------- Users (admin) ----------

export async function saveSignupLimit(form: FormData) {
  await requireAdmin();
  const n = Number(form.get("signup_limit"));
  if (!Number.isInteger(n) || n < 0 || n > 100) {
    redirect("/dashboard/users?error=" + encodeURIComponent("Open spots must be a whole number from 0 to 100."));
  }
  const sql = await db();
  await sql`update settings set signup_limit = ${n} where id = 1`;
  revalidatePath("/dashboard/users");
  redirect("/dashboard/users?saved=1");
}

export async function removeUser(form: FormData) {
  const me = await requireAdmin();
  const id = Number(form.get("id"));
  const sql = await db();
  // Owners (admins) cannot be removed here; only regular users.
  await sql`delete from users where id = ${id} and role = 'user' and id <> ${me.id}`;
  revalidatePath("/dashboard/users");
}

export async function deleteMyAccount() {
  const me = await requireUser();
  if (me.role === "admin") redirect("/dashboard/calendars?error=" + encodeURIComponent("Owners cannot delete their account here."));
  const sql = await db();
  await sql`delete from users where id = ${me.id} and role = 'user'`;
  await endSession();
  redirect("/");
}

// ---------- Vibe ----------

export async function saveFavoriteShow(form: FormData) {
  const me = await requireUser();
  const show = String(form.get("favorite_show") ?? "").trim().slice(0, 120);
  if (!show) redirect("/dashboard/welcome?error=" + encodeURIComponent("Tell us a show, any show."));
  const matched = matchVibe(show);
  const sql = await db();
  await sql`
    insert into user_settings (user_id, favorite_show, vibe) values (${me.id}, ${show}, ${matched ?? "mall"})
    on conflict (user_id) do update set favorite_show = excluded.favorite_show, vibe = excluded.vibe`;
  revalidatePath("/", "layout");
  redirect(`/dashboard/welcome?step=vibe${matched ? "" : "&nomatch=1"}`);
}

export async function saveVibe(form: FormData) {
  const me = await requireUser();
  const vibe = String(form.get("vibe") ?? "");
  if (!isVibe(vibe)) redirect("/dashboard/calendars?error=" + encodeURIComponent("Pick one of the vibes."));
  const sql = await db();
  await sql`
    insert into user_settings (user_id, vibe) values (${me.id}, ${vibe})
    on conflict (user_id) do update set vibe = excluded.vibe`;
  revalidatePath("/", "layout");
  redirect(String(form.get("next") ?? "") === "welcome" ? "/dashboard/calendars?welcome=1" : "/dashboard/calendars?saved=1");
}

// ---------- Daily check-in (private to each user) ----------

export async function saveCheckIn(form: FormData) {
  const me = await requireUser();
  const day = await todayFor(me.id);
  const sql = await db();
  const back = String(form.get("back") ?? "/dashboard");
  const safeBack = back.startsWith("/dashboard") ? back : "/dashboard";
  if (form.get("skip") === "1") {
    await sql`
      insert into user_checkins (user_id, day, skipped) values (${me.id}, ${day}, true)
      on conflict (user_id, day) do update set skipped = true, energy = null, stress = null, mood = null`;
  } else {
    const [energy, stress, mood] = ["energy", "stress", "mood"].map((k) => Number(form.get(k)));
    if (![energy, stress, mood].every(isScale)) redirect(`${safeBack}?error=${encodeURIComponent("Pick an answer for all three questions.")}`);
    await sql`
      insert into user_checkins (user_id, day, energy, stress, mood) values (${me.id}, ${day}, ${energy}, ${stress}, ${mood})
      on conflict (user_id, day) do update set energy = excluded.energy, stress = excluded.stress, mood = excluded.mood, skipped = false`;
  }
  // Keep only the last 30 days.
  await sql`delete from user_checkins where user_id = ${me.id} and day < ${day}::date - 30`;
  revalidatePath("/dashboard", "layout");
  redirect(safeBack === "/dashboard" ? "/dashboard?checkin=1" : safeBack);
}

export async function redoCheckIn() {
  const me = await requireUser();
  const sql = await db();
  await sql`delete from user_checkins where user_id = ${me.id} and day = ${await todayFor(me.id)}`;
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
