import { DateTime } from "luxon";
import ConfirmButton from "@/components/ConfirmButton";
import type { BookingRow } from "@/lib/booking";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/eventTypes";
import { requireUser } from "@/lib/session";
import { cancelBookingAction, redoCheckIn } from "./actions";
import { todaysCheckIn } from "@/lib/checkins";
import { hostTip, type CheckIn } from "@/lib/wellbeing";

export default async function Bookings({ searchParams }: { searchParams: Promise<{ error?: string; past?: string }> }) {
  const { error, past } = await searchParams;
  const sql = await db();
  const me = await requireUser();
  const { time_zone } = await getSettings(me.id);
  const checkIn = await todaysCheckIn(me.id);
  const tip = checkIn && !checkIn.skipped ? hostTip(checkIn as CheckIn) : null;
  const showPast = past === "1";
  const rows = showPast
    ? await sql<BookingRow[]>`select * from bookings where user_id = ${me.id} and start_at < now() order by start_at desc limit 100`
    : await sql<BookingRow[]>`
        select * from bookings where user_id = ${me.id} and end_at >= now()
          and (status = 'confirmed' or cancelled_at > now() - interval '7 days')
        order by start_at limit 200`;

  const fmt = (d: Date) => DateTime.fromJSDate(d, { zone: time_zone }).toFormat("ccc LLL d, h:mm a");

  return (
    <>
      <div className="row spread" style={{ marginBottom: 16 }}>
        <div>
          <h1>{showPast ? "Past bookings" : "Upcoming bookings"}</h1>
          <p className="muted small">Times shown in {time_zone}.</p>
        </div>
        <a href={showPast ? "/dashboard" : "/dashboard?past=1"}>{showPast ? "Show upcoming" : "Show past"}</a>
      </div>
      {error && <div className="alert error">{error}</div>}
      {tip && !showPast && (
        <div className="card stack selftip">
          <div className="row spread">
            <h2 style={{ margin: 0 }}>Today&apos;s tip for you</h2>
            <form action={redoCheckIn}>
              <button className="linkbtn small">Redo check-in</button>
            </form>
          </div>
          <p style={{ margin: 0 }}>{tip.text}</p>
          <p className="small muted" style={{ margin: 0 }}>
            Based on your private check-in. Source: {tip.source}
          </p>
        </div>
      )}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0 }}>
            No bookings yet.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Meeting</th>
                <th>Guest</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} style={b.status !== "confirmed" ? { opacity: 0.55 } : undefined}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {fmt(b.start_at)}
                    {b.status !== "confirmed" && (
                      <>
                        {" "}
                        <span className="badge error">Cancelled</span>
                      </>
                    )}
                  </td>
                  <td>
                    {b.event_title}
                    {b.meet_link && (
                      <div className="small">
                        <a href={b.meet_link} target="_blank" rel="noreferrer">
                          Meet link
                        </a>
                      </div>
                    )}
                  </td>
                  <td>
                    {b.guest_name}
                    <div className="small muted">{b.guest_email}</div>
                    {b.guest_phone && <div className="small muted">{b.guest_phone}</div>}
                    {b.notes && <div className="small" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{b.notes}</div>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {b.status === "confirmed" && b.start_at > new Date() && (
                      <form action={cancelBookingAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <ConfirmButton message={`Cancel ${b.event_title} with ${b.guest_name}? Google will email them a cancellation.`}>
                          Cancel
                        </ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
