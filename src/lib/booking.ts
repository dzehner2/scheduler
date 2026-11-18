import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { config } from "./config";
import { randomToken, safeEqual } from "./crypto";
import { db } from "./db";
import { accessToken, busyTime } from "./accounts";
import * as google from "./google";
import { getSettings, locationLabel, rulesFor, type EventType } from "./eventTypes";
import { blockedRange, isSlotAvailable } from "./slots";

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
}

export interface BookingRow {
  id: string;
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
  return { name, email, phone, notes };
}

const LOCK_KEY = 7_220_011; // any constant; serializes bookings so two guests cannot take the same time

export async function createBooking(t: EventType, startMs: number, input: GuestInput): Promise<BookingRow> {
  if (!t.active) throw new BookingError("This booking link is turned off.", 404);
  const guest = validateGuest(t, input);
  const settings = await getSettings();
  if (!settings.booking_account_id || !settings.booking_calendar_id) {
    throw new BookingError("Booking is not set up yet.", 503);
  }
  const rules = rulesFor(t);
  const endMs = startMs + t.duration_min * 60_000;
  const block = blockedRange(rules, startMs);
  const sql = await db();

  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK_KEY})`;

    // Fresh check of every calendar, at the moment of booking.
    const dayStart = DateTime.fromMillis(startMs, { zone: settings.time_zone }).startOf("day");
    const busy = await deps.busyTime(Math.min(block.start, dayStart.toMillis()), Math.max(block.end, dayStart.plus({ days: 1 }).toMillis()));
    const sameType = await tx<{ start_at: Date }[]>`
      select start_at from bookings
      where status = 'confirmed' and event_type_id = ${t.id}
        and start_at >= ${dayStart.toJSDate()} and start_at < ${dayStart.plus({ days: 1 }).toJSDate()}`;
    const confirmed = await tx<{ block_start_at: Date; block_end_at: Date }[]>`
      select block_start_at, block_end_at from bookings
      where status = 'confirmed' and block_end_at > ${new Date(block.start)} and block_start_at < ${new Date(block.end)}`;

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
    if (!ok) throw new BookingError("Sorry, that time was just taken. Please pick another.", 409);

    const id = randomUUID();
    const cancelToken = randomToken();
    const manageUrl = `${config.appUrl}/booking/${id}?t=${cancelToken}`;
    const description = [
      `Booked by ${guest.name} (${guest.email})`,
      guest.phone ? `Phone: ${guest.phone}` : "",
      guest.notes ? `\nNotes from ${guest.name}:\n${guest.notes}` : "",
      t.location_type === "custom" && t.location_detail ? `\n${t.location_detail}` : "",
      `\nNeed to cancel or reschedule? ${manageUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const token = await deps.accessToken(settings.booking_account_id!);
    const event = await deps.insertEvent(token, settings.booking_calendar_id!, {
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

    try {
      const [row] = await tx<BookingRow[]>`
        insert into bookings (id, event_type_id, event_title, start_at, end_at, block_start_at, block_end_at,
          guest_name, guest_email, guest_phone, notes, account_id, calendar_id, google_event_id, meet_link, cancel_token)
        values (${id}, ${t.id}, ${t.title}, ${new Date(startMs)}, ${new Date(endMs)}, ${new Date(block.start)},
          ${new Date(block.end)}, ${guest.name}, ${guest.email}, ${guest.phone}, ${guest.notes},
          ${settings.booking_account_id}, ${settings.booking_calendar_id}, ${event.id}, ${event.hangoutLink ?? null},
          ${cancelToken})
        returning *`;
      return row;
    } catch (err) {
      // Do not leave an orphan event on the calendar if we could not record it.
      await deps.deleteEvent(token, settings.booking_calendar_id!, event.id).catch(() => {});
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
  if (b.google_event_id && b.account_id && b.calendar_id) {
    const token = await deps.accessToken(b.account_id);
    await deps.deleteEvent(token, b.calendar_id, b.google_event_id);
  }
  const sql = await db();
  await sql`update bookings set status = 'cancelled', cancelled_at = now() where id = ${b.id}`;
}

export { locationLabel };
