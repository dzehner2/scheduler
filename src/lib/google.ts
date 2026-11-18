import { config, GOOGLE_SCOPES } from "./config";
import type { Interval } from "./slots";

// Overridable only so the local test harness can point at a fake Google.
const AUTH_URL = process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const USERINFO_URL = process.env.GOOGLE_USERINFO_URL || "https://openidconnect.googleapis.com/v1/userinfo";
const CAL = process.env.GOOGLE_CALENDAR_API || "https://www.googleapis.com/calendar/v3";

export class GoogleError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function call<T>(url: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const code = typeof body.error === "string" ? body.error : body.error?.status;
    const msg = body.error_description || body.error?.message || `Google request failed (${res.status})`;
    throw new GoogleError(msg, res.status, code);
  }
  return body as T;
}

export const redirectUri = () => `${config.appUrl}/api/auth/callback`;

export function authUrl(state: string, loginHint?: string): string {
  const p = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) p.set("login_hint", loginHint);
  return `${AUTH_URL}?${p}`;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return call(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
}

export function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return call(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      grant_type: "refresh_token",
    }),
  });
}

export async function userEmail(token: string): Promise<string> {
  const info = await call<{ email?: string; email_verified?: boolean }>(USERINFO_URL, { token });
  if (!info.email || info.email_verified === false) throw new Error("Google did not return a verified email.");
  return info.email.toLowerCase();
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
  primary?: boolean;
}

export async function listCalendars(token: string): Promise<GoogleCalendar[]> {
  const out: GoogleCalendar[] = [];
  let pageToken: string | undefined;
  do {
    const p = new URLSearchParams({ maxResults: "250" });
    if (pageToken) p.set("pageToken", pageToken);
    const res = await call<{ items?: GoogleCalendar[]; nextPageToken?: string }>(
      `${CAL}/users/me/calendarList?${p}`,
      { token },
    );
    out.push(...(res.items ?? []));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

/**
 * Busy time across the given calendars. Throws if Google reports an error for
 * ANY calendar, so the caller can refuse to offer times rather than risk a
 * double booking.
 */
export async function freeBusy(token: string, calendarIds: string[], start: number, end: number): Promise<Interval[]> {
  const busy: Interval[] = [];
  for (let i = 0; i < calendarIds.length; i += 50) {
    const ids = calendarIds.slice(i, i + 50);
    const res = await call<{
      calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }>;
    }>(`${CAL}/freeBusy`, {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: new Date(start).toISOString(),
        timeMax: new Date(end).toISOString(),
        items: ids.map((id) => ({ id })),
      }),
    });
    for (const id of ids) {
      const cal = res.calendars?.[id];
      if (!cal) throw new GoogleError(`No free/busy data returned for calendar ${id}`, 502);
      if (cal.errors?.length) {
        throw new GoogleError(`Calendar ${id} could not be checked: ${cal.errors.map((e) => e.reason).join(", ")}`, 502);
      }
      for (const b of cal.busy ?? []) busy.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
    }
  }
  return busy;
}

export interface NewEvent {
  summary: string;
  description: string;
  start: number;
  end: number;
  timeZone: string;
  attendees: { email: string; displayName?: string }[];
  location?: string;
  meet: boolean;
  requestId: string;
}

export async function insertEvent(
  token: string,
  calendarId: string,
  e: NewEvent,
): Promise<{ id: string; hangoutLink?: string; htmlLink?: string }> {
  const p = new URLSearchParams({ sendUpdates: "all", conferenceDataVersion: e.meet ? "1" : "0" });
  return call(`${CAL}/calendars/${encodeURIComponent(calendarId)}/events?${p}`, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: { dateTime: new Date(e.start).toISOString(), timeZone: e.timeZone },
      end: { dateTime: new Date(e.end).toISOString(), timeZone: e.timeZone },
      attendees: e.attendees,
      reminders: { useDefault: true },
      extendedProperties: { private: { scheduler: "1" } },
      ...(e.meet
        ? { conferenceData: { createRequest: { requestId: e.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } } }
        : {}),
    }),
  });
}

export async function deleteEvent(token: string, calendarId: string, eventId: string): Promise<void> {
  try {
    await call(
      `${CAL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: "DELETE", token },
    );
  } catch (err) {
    // Already deleted in Google Calendar: nothing left to do.
    if (err instanceof GoogleError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}
