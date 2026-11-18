import { DateTime } from "luxon";
import ConfirmButton from "@/components/ConfirmButton";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/eventTypes";
import { requireAdmin } from "@/lib/session";
import { signupLimit } from "@/lib/users";
import { removeUser, saveSignupLimit } from "../actions";

interface Row {
  id: number;
  email: string;
  handle: string | null;
  role: string;
  created_at: Date;
  links: number;
  bookings: number;
}

export default async function Users({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const me = await requireAdmin();
  const sql = await db();
  const { time_zone } = await getSettings(me.id);
  const limit = await signupLimit();
  const rows = await sql<Row[]>`
    select u.id, u.email, u.handle, u.role, u.created_at,
      (select count(*)::int from event_types e where e.user_id = u.id) as links,
      (select count(*)::int from bookings b where b.user_id = u.id and b.status = 'confirmed') as bookings
    from users u order by (u.role = 'admin') desc, u.created_at`;
  const regular = rows.filter((r) => r.role === "user").length;

  return (
    <>
      <h1>Users</h1>
      <p className="muted small">
        {regular} of {limit} sign-up spots used. You only see each person&apos;s email and counts here, never their
        calendars or bookings.
      </p>
      {error && <div className="alert error">{error}</div>}
      {saved && <div className="alert ok">Saved.</div>}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Address</th>
              <th>Links</th>
              <th>Upcoming and past bookings</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.email}
                  {r.role === "admin" && (
                    <>
                      {" "}
                      <span className="badge ok">Owner</span>
                    </>
                  )}
                </td>
                <td className="small">{r.handle ? `/${r.handle}` : "site root"}</td>
                <td>{r.links}</td>
                <td>{r.bookings}</td>
                <td className="small" style={{ whiteSpace: "nowrap" }}>
                  {DateTime.fromJSDate(r.created_at, { zone: time_zone }).toFormat("LLL d, yyyy")}
                </td>
                <td style={{ textAlign: "right" }}>
                  {r.role === "user" && (
                    <form action={removeUser}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message={`Remove ${r.email}? Their links stop working and their PlayDate data is deleted. Events already on their Google Calendar stay.`}>
                        Remove
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="card stack" action={saveSignupLimit}>
        <h2>Open sign-up spots</h2>
        <p className="muted small">
          How many people can sign up without the waitlist. You and other owners do not count. Google allows up to 100
          people on an unverified app.
        </p>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <input name="signup_limit" type="number" min={0} max={100} defaultValue={limit} style={{ width: 120 }} aria-label="Open spots" />
          <button className="btn secondary small">Save</button>
        </div>
      </form>
    </>
  );
}
