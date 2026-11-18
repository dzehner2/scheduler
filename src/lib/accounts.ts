import { config } from "./config";
import { decrypt, encrypt } from "./crypto";
import { db } from "./db";
import * as google from "./google";
import type { Interval } from "./slots";

export interface AccountRow {
  id: number;
  email: string;
  refresh_token: string;
  access_token: string | null;
  access_expires_at: Date | null;
  status: string;
  last_error: string | null;
}

export class CalendarUnavailableError extends Error {}

/** Save (or update) a Google account after the OAuth callback, then sync its calendar list. */
export async function saveAccount(email: string, tokens: google.TokenResponse): Promise<number> {
  const sql = await db();
  const secret = config.appSecret;
  const expires = new Date(Date.now() + tokens.expires_in * 1000);
  const access = encrypt(tokens.access_token, secret);

  let id: number;
  if (tokens.refresh_token) {
    const refresh = encrypt(tokens.refresh_token, secret);
    const [row] = await sql<{ id: number }[]>`
      insert into accounts (email, refresh_token, access_token, access_expires_at)
      values (${email}, ${refresh}, ${access}, ${expires})
      on conflict (email) do update set
        refresh_token = excluded.refresh_token, access_token = excluded.access_token,
        access_expires_at = excluded.access_expires_at, status = 'ok', last_error = null
      returning id`;
    id = row.id;
  } else {
    const [row] = await sql<{ id: number }[]>`
      update accounts set access_token = ${access}, access_expires_at = ${expires}, status = 'ok', last_error = null
      where email = ${email} returning id`;
    if (!row) throw new Error("Google did not return a refresh token. Remove the app's access in your Google account settings and try again.");
    id = row.id;
  }

  await syncCalendars(id);

  // First account connected becomes the booking calendar (its primary calendar).
  await sql`
    update settings set booking_account_id = ${id}, booking_calendar_id = ${email}
    where id = 1 and booking_account_id is null`;
  return id;
}

async function markError(id: number, message: string) {
  const sql = await db();
  await sql`update accounts set status = 'error', last_error = ${message} where id = ${id}`;
}

/** Valid access token for an account, refreshing it if needed. */
export async function accessToken(accountId: number): Promise<string> {
  const sql = await db();
  const [acct] = await sql<AccountRow[]>`select * from accounts where id = ${accountId}`;
  if (!acct) throw new CalendarUnavailableError(`Account ${accountId} not found`);
  const secret = config.appSecret;

  if (acct.access_token && acct.access_expires_at && acct.access_expires_at.getTime() > Date.now() + 60_000) {
    return decrypt(acct.access_token, secret);
  }
  try {
    const t = await google.refreshAccessToken(decrypt(acct.refresh_token, secret));
    const expires = new Date(Date.now() + t.expires_in * 1000);
    await sql`
      update accounts set access_token = ${encrypt(t.access_token, secret)}, access_expires_at = ${expires},
        status = 'ok', last_error = null
      where id = ${accountId}`;
    return t.access_token;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof google.GoogleError && (err.code === "invalid_grant" || err.status === 400 || err.status === 401)) {
      await markError(accountId, `Google access expired or was revoked. Reconnect ${acct.email}. (${msg})`);
    }
    throw new CalendarUnavailableError(`Could not refresh access for ${acct.email}: ${msg}`);
  }
}

export async function syncCalendars(accountId: number): Promise<void> {
  const sql = await db();
  const token = await accessToken(accountId);
  const cals = await google.listCalendars(token);
  const existing = new Set(
    (await sql<{ google_id: string }[]>`select google_id from calendars where account_id = ${accountId}`).map((r) => r.google_id),
  );
  for (const c of cals) {
    const name = c.summaryOverride || c.summary;
    // New calendars you own or edit count as busy by default. Subscribed calendars
    // (holidays, other people's shared calendars) start unchecked.
    const defaultCheck = c.primary === true || c.accessRole === "owner" || c.accessRole === "writer";
    if (existing.has(c.id)) {
      await sql`
        update calendars set summary = ${name}, color = ${c.backgroundColor ?? null}, access_role = ${c.accessRole}
        where account_id = ${accountId} and google_id = ${c.id}`;
    } else {
      await sql`
        insert into calendars (account_id, google_id, summary, color, access_role, check_conflicts)
        values (${accountId}, ${c.id}, ${name}, ${c.backgroundColor ?? null}, ${c.accessRole}, ${defaultCheck})`;
    }
  }
  const ids = cals.map((c) => c.id);
  await sql`delete from calendars where account_id = ${accountId} and not (google_id = any(${ids}))`;
}

/**
 * Busy time from every calendar marked "check for conflicts", on every
 * connected account, plus every booking calendar (default and per link) and confirmed bookings stored
 * here. Fails closed: if any calendar cannot be read, this throws.
 */
export async function busyTime(start: number, end: number): Promise<Interval[]> {
  const sql = await db();
  const rows = await sql<{ account_id: number; google_id: string }[]>`
    select c.account_id, c.google_id from calendars c where c.check_conflicts
    union
    select s.booking_account_id, s.booking_calendar_id from settings s
      where s.booking_account_id is not null and s.booking_calendar_id is not null
    union
    select e.booking_account_id, e.booking_calendar_id from event_types e
      join calendars c on c.account_id = e.booking_account_id and c.google_id = e.booking_calendar_id
      where e.active`;
  if (rows.length === 0) throw new CalendarUnavailableError("No calendars are connected yet.");

  const broken = await sql<{ email: string }[]>`
    select distinct a.email from accounts a
    join calendars c on c.account_id = a.id and c.check_conflicts
    where a.status <> 'ok'`;
  if (broken.length) {
    throw new CalendarUnavailableError(`Reconnect required for: ${broken.map((b) => b.email).join(", ")}`);
  }

  const byAccount = new Map<number, string[]>();
  for (const r of rows) byAccount.set(r.account_id, [...(byAccount.get(r.account_id) ?? []), r.google_id]);

  const results = await Promise.all(
    [...byAccount].map(async ([accountId, ids]) => {
      try {
        return await google.freeBusy(await accessToken(accountId), ids, start, end);
      } catch (err) {
        if (err instanceof CalendarUnavailableError) throw err;
        throw new CalendarUnavailableError(err instanceof Error ? err.message : String(err));
      }
    }),
  );

  const booked = await sql<{ block_start_at: Date; block_end_at: Date }[]>`
    select block_start_at, block_end_at from bookings
    where status = 'confirmed' and block_end_at > ${new Date(start)} and block_start_at < ${new Date(end)}`;

  return [
    ...results.flat(),
    ...booked.map((b) => ({ start: b.block_start_at.getTime(), end: b.block_end_at.getTime() })),
  ];
}
