import Link from "next/link";
import CopyLink from "@/components/CopyLink";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { listEventTypes, locationLabel } from "@/lib/eventTypes";
import { requireUser } from "@/lib/session";
import { isPrimaryOwner, linkPath } from "@/lib/users";

export default async function EventTypes({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const me = await requireUser();
  const types = await listEventTypes(me.id);
  const handle = isPrimaryOwner(me) ? null : me.handle;
  const sql = await db();
  const cals = await sql<{ account_id: number; google_id: string; summary: string; email: string }[]>`
    select c.account_id, c.google_id, c.summary, a.email from calendars c join accounts a on a.id = c.account_id
    where a.user_id = ${me.id}`;
  const calName = (accountId: number | null, calendarId: string | null) => {
    if (!accountId || !calendarId) return null;
    const c = cals.find((x) => x.account_id === accountId && x.google_id === calendarId);
    return c ? `${c.summary} (${c.email})` : "a calendar that is no longer connected";
  };
  return (
    <>
      <div className="row spread" style={{ marginBottom: 16 }}>
        <h1>Booking links</h1>
        <Link className="btn" href="/dashboard/event-types/new">
          New booking link
        </Link>
      </div>
      {saved && <div className="alert ok">Saved.</div>}
      {types.length === 0 && (
        <div className="card muted">Create your first booking link, for example a 30 minute intro call.</div>
      )}
      {types.map((t) => {
        const url = `${config.appUrl}${linkPath(handle, t.slug)}`;
        return (
          <div className="card row spread" key={t.id}>
            <div>
              <div className="row">
                <h2 style={{ margin: 0 }}>{t.title}</h2>
                {!t.active && <span className="badge">Off</span>}
              </div>
              <div className="muted small">
                {t.duration_min} min, {locationLabel(t)}
                {t.daily_cap ? `, max ${t.daily_cap} per day` : ""}
                {t.theme === "brand" && t.brand_name ? `, ${t.brand_name} branding` : ""}
              </div>
              {calName(t.booking_account_id, t.booking_calendar_id) && (
                <div className="muted small">Bookings go on {calName(t.booking_account_id, t.booking_calendar_id)}</div>
              )}
              <a className="small" href={linkPath(handle, t.slug)} target="_blank">
                {url}
              </a>
            </div>
            <div className="row">
              <CopyLink url={url} />
              <Link className="btn secondary small" href={`/dashboard/event-types/${t.id}`}>
                Edit
              </Link>
            </div>
          </div>
        );
      })}
    </>
  );
}
