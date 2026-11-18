import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { config } from "./config";
import { randomToken, safeEqual } from "./crypto";
import { db } from "./db";
import { accessToken, busyTime } from "./accounts";
import * as google from "./google";
import { getSettings, locationLabel, rulesFor, type EventType } from "./eventTypes";
import { blockedRange, isSlotAvailable } from "./slots";
import { MAX_ANSWER, MAX_GOAL, sameAnswer } from "./personalize";

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export interface GuestInput {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  /** Optional personal touches; ignored unless the link has them turned on. */
  commonAnswer?: string;
  meetingGoal?: string;
  walkOk?: boolean;
}

export interface ExtraEvent {
  account_id: number;
  calendar_id: string;
  event_id: string;
}

export interface BookingRow {
  id: string;
  common_answer: string;
  meeting_goal: string;
  walk_ok: boolean;
  extra_events: ExtraEvent[];
  user_id: number;
  event_type_id: number | null;
  event_title: string;
  start_at: Date;
  end_at: Date;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  notes: string;
  status: string;
  account_id: number | null;
  calendar_id: string | null;
  google_event_id: string | null;
  meet_link: string | null;
  cancel_token: string;
  created_at: Date;
}

/** Swappable for tests. */
export const deps = {
  busyTime,
  accessToken,
  insertEvent: google.insertEvent,
  deleteEvent: google.deleteEvent,
  now: () => Date.now(),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateGuest(t: EventType, g: GuestInput): Required<GuestInput> {
  const name = (g.name ?? "").trim();
  const email = (g.email ?? "").trim().toLowerCase();
  const phone = (g.phone ?? "").trim();
  const notes = (g.notes ?? "").trim();
  if (!name || name.length > 120) throw new BookingError("Please enter your name.");
  if (!EMAIL_RE.test(email) || email.length > 200) throw new BookingError("Please enter a valid email address.");
  if (t.location_type === "phone" && !/^[+()\-.\s\d]{7,25}$/.test(phone)) {
    throw new BookingError("Please enter a phone number we can call.");
  }
  if (notes.length > 2000) throw new BookingError("Notes are too long.");
  const commonAnswer = t.personal_common ? String(g.commonAnswer ?? "").trim() : "";
  const meetingGoal = t.personal_goal ? String(g.meetingGoal ?? "").trim() : "";
  const walkOk = t.personal_walk ? g.walkOk === true : false;
  if (commonAnswer.length > MAX_ANSWER) throw new BookingError("That answer is too long.");
  if (meetingGoal.length > MAX_GOAL) throw new BookingError("Your goal is too long.");
  return { name, email, phone, notes, commonAnswer, meetingGoal, walkOk };
}

/**
 * Calendar a link's bookings go on: the link's own choice if it is still
 * connected and editable, otherwise the default from settings.
 */
export async function bookingCalendarFor(t: EventType): Promise<{ accountId: number; calendarId: string } | null> {
  const sql = await db();
  if (t.booking_account_id && t.booking_calendar_id) {
    const [ok] = await sql`
      select 1 from calendars c join accounts a on a.id = c.account_id
      where c.account_id = ${t.booking_account_id} and c.google_id = ${t.booking_calendar_id}
        and c.access_role in ('owner', 'writer') and a.user_id = ${t.user_id}`;
    if (ok) return { accountId: t.booking_account_id, calendarId: t.booking_calendar_id };
  }
  const s = await getSettings(t.user_id);
  if (s.booking_account_id && s.booking_calendar_id) {
    const [mine] = await sql`select 1 from accounts where id = ${s.booking_account_id} and user_id = ${t.user_id}`;
    if (mine) return { accountId: s.booking_account_id, calendarId: s.booking_calendar_id };
  }
  return null;
}

/**
 * Extra calendars that get a silent copy: only the link owner's own, editable,
 * connected calendars, never the main one, at most 10.
 */
export async function extraCalendarsFor(t: EventType, main: { accountId: number; calendarId: string }) {
  const refs = Array.isArray(t.extra_calendars) ? t.extra_calendars : [];
  if (!refs.length) return [];
  const sql = await db();
  const rows = await sql<{ account_id: number; google_id: string }[]>`
    select c.account_id, c.google_id from calendars c join accounts a on a.id = c.account_id
    where a.user_id = ${t.user_id} and a.status = 'ok' and c.access_role in ('owner', 'writer')`;
  const ok = new Set(rows.map((r) => `${r.account_id}|${r.google_id}`));
  const seen = new Set<string>([`${main.accountId}|${main.calendarId}`]);
  const out: { accountId: number; calendarId: string }[] = [];
  for (const r of refs) {
    const key = `${r.account_id}|${r.calendar_id}`;
    if (ok.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push({ accountId: r.account_id, calendarId: r.calendar_id });
    }
  }
  return out.slice(0, 10);
}

async function removeExtras(extras: ExtraEvent[]) {
  await Promise.all(
    extras.map(async (x) => {
      try {
        await deps.deleteEvent(await deps.accessToken(x.account_id), x.calendar_id, x.event_id, false);
      } catch (err) {
        console.error("Could not remove booking copy", err);
      }
    }),
  );
}

const LOCK_KEY = 7_220_011; // any constant; serializes bookings so two guests cannot take the same time

export async function createBooking(t: EventType, startMs: number, input: GuestInput): Promise<BookingRow> {
  if (!t.active) throw new BookingError("This booking link is turned off.", 404);
  const guest = validateGuest(t, input);
  const settings = await getSettings(t.user_id);
  const target = await bookingCalendarFor(t);
  if (!target) throw new BookingError("Booking is not set up yet.", 503);
  const rules = rulesFor(t);
  const endMs = startMs + t.duration_min * 60_000;
  const block = blockedRange(rules, startMs);
  const sql = await db();

  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK_KEY}, ${t.user_id})`; // per user

    // Fresh check of every calendar, at the moment of booking.
    const dayStart = DateTime.fromMillis(startMs, { zone: settings.time_zone }).startOf("day");
    const busy = await deps.busyTime(t.user_id, Math.min(block.start, dayStart.toMillis()), Math.max(block.end, dayStart.plus({ days: 1 }).toMillis()));
    const sameType = await tx<{ start_at: Date }[]>`
      select start_at from bookings
      where status = 'confirmed' and event_type_id = ${t.id}
        and start_at >= ${dayStart.toJSDate()} and start_at < ${dayStart.plus({ days: 1 }).toJSDate()}`;
    const confirmed = await tx<{ block_start_at: Date; block_end_at: Date }[]>`
      select block_start_at, block_end_at from bookings
      where status = 'confirmed' and user_id = ${t.user_id}
        and block_end_at > ${new Date(block.start)} and block_start_at < ${new Date(block.end)}`;

    const ok = isSlotAvailable(
      {
        rules,
        timeZone: settings.time_zone,
        now: deps.now(),
        busy: [...busy, ...confirmed.map((c) => ({ start: c.block_start_at.getTime(), end: c.block_end_at.getTime() }))],
        sameTypeBookingStarts: sameType.map((s) => s.start_at.getTime()),
      },
      startMs,
    );
    if (!ok) throw new BookingError(
        t.theme === "brand"
          ? "Sorry, that time was just taken. Please pick another."
          : "Busy signal! Someone just grabbed that time. Please pick another.",
        409,
      );

    const id = randomUUID();
    const cancelToken = randomToken();
    const manageUrl = `${config.appUrl}/booking/${id}?t=${cancelToken}`;
    const description = [
      `Booked by ${guest.name} (${guest.email})`,
      guest.phone ? `Phone: ${guest.phone}` : "",
      guest.meetingGoal ? `\nWhat would make this time great: ${guest.meetingGoal}` : "",
      guest.commonAnswer ? `${t.common_prompt}: ${guest.commonAnswer}${sameAnswer(guest.commonAnswer, t.common_host_answer) ? " (same as yours!)" : ""}` : "",
      guest.walkOk ? "Up for a walking call" : "",
      guest.notes ? `\nNotes from ${guest.name}:\n${guest.notes}` : "",
      t.location_type === "custom" && t.location_detail ? `\n${t.location_detail}` : "",
      `\nNeed to cancel or reschedule? ${manageUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const token = await deps.accessToken(target.accountId);
    const event = await deps.insertEvent(token, target.calendarId, {
      summary: `${t.title} with ${guest.name}`,
      description,
      start: startMs,
      end: endMs,
      timeZone: settings.time_zone,
      attendees: [{ email: guest.email, displayName: guest.name }],
      location:
        t.location_type === "phone"
          ? `Phone: ${guest.phone}`
          : t.location_type === "in_person"
            ? t.location_detail
            : undefined,
      meet: t.location_type === "meet",
      requestId: id,
    });

    // Silent copies on the other calendars the owner picked. Best effort: a
    // failed copy never cancels the real booking.
    const extras: ExtraEvent[] = [];
    for (const x of await extraCalendarsFor(t, target)) {
      try {
        const copy = await deps.insertEvent(await deps.accessToken(x.accountId), x.calendarId, {
          summary: `${t.title} with ${guest.name}`,
          description: [event.hangoutLink ? `Google Meet: ${event.hangoutLink}` : "", description].filter(Boolean).join("\n\n"),
          start: startMs,
          end: endMs,
          timeZone: settings.time_zone,
          attendees: [],
          location: event.hangoutLink ?? (t.location_type === "phone" ? `Phone: ${guest.phone}` : t.location_type === "in_person" ? t.location_detail : undefined),
          meet: false,
          requestId: `${id}-${extras.length + 1}`,
          notify: false,
        });
        extras.push({ account_id: x.accountId, calendar_id: x.calendarId, event_id: copy.id });
      } catch (err) {
        console.error("Could not add booking copy", err);
      }
    }

    try {
      const [row] = await tx<BookingRow[]>`
        insert into bookings (id, user_id, event_type_id, event_title, start_at, end_at, block_start_at, block_end_at,
          guest_name, guest_email, guest_phone, notes, account_id, calendar_id, google_event_id, meet_link, cancel_token,
          extra_events, common_answer, meeting_goal, walk_ok)
        values (${id}, ${t.user_id}, ${t.id}, ${t.title}, ${new Date(startMs)}, ${new Date(endMs)}, ${new Date(block.start)},
          ${new Date(block.end)}, ${guest.name}, ${guest.email}, ${guest.phone}, ${guest.notes},
          ${target.accountId}, ${target.calendarId}, ${event.id}, ${event.hangoutLink ?? null},
          ${cancelToken}, ${tx.json(extras as never)}, ${guest.commonAnswer}, ${guest.meetingGoal}, ${guest.walkOk})
        returning *`;
      return row;
    } catch (err) {
      // Do not leave an orphan event on the calendar if we could not record it.
      await deps.deleteEvent(token, target.calendarId, event.id).catch(() => {});
      await removeExtras(extras);
      throw err;
    }
  });
}

export async function getBooking(id: string): Promise<BookingRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sql = await db();
  const [b] = await sql<BookingRow[]>`select * from bookings where id = ${id}`;
  return b ?? null;
}

export function tokenMatches(b: BookingRow, token: string | undefined | null): boolean {
  return !!token && safeEqual(b.cancel_token, token);
}

/** Cancel a booking: deletes the calendar event (Google emails the guest) and frees the time. */
export async function cancelBooking(b: BookingRow): Promise<void> {
  if (b.status !== "confirmed") return;
  await removeExtras(Array.isArray(b.extra_events) ? b.extra_events : []);
  if (b.google_event_id && b.account_id && b.calendar_id) {
    const token = await deps.accessToken(b.account_id);
    await deps.deleteEvent(token, b.calendar_id, b.google_event_id);
  }
  const sql = await db();
  await sql`update bookings set status = 'cancelled', cancelled_at = now() where id = ${b.id}`;
}

export { locationLabel };
