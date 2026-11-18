import { DateTime } from "luxon";
import ConfirmButton from "@/components/ConfirmButton";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/eventTypes";
import { requireAdmin } from "@/lib/session";
import { removeWaitlistEntry } from "../actions";

export default async function Waitlist() {
  const sql = await db();
  const me = await requireAdmin();
  const { time_zone } = await getSettings(me.id);
  const rows = await sql<{ id: number; name: string; email: string; use_case: string; created_at: Date }[]>`
    select * from waitlist order by created_at desc`;
  const coffee = !!process.env.COFFEE_URL;
  return (
    <>
      <div className="row spread" style={{ marginBottom: 16 }}>
        <div>
          <h1>Waitlist</h1>
          <p className="muted small">
            {rows.length} {rows.length === 1 ? "person" : "people"} signed up at <a href="/signup" target="_blank">/signup</a>.
            {!coffee && " Add COFFEE_URL in Vercel to show your Buy Me a Coffee button there."}
          </p>
        </div>
        {rows.length > 0 && (
          <a className="btn secondary small" href="/api/waitlist/export">
            Download CSV
          </a>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0 }}>
            No sign-ups yet. Share your sign-up page to start the list.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Signed up</th>
                <th>Name</th>
                <th>Use</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{DateTime.fromJSDate(r.created_at, { zone: time_zone }).toFormat("LLL d, yyyy")}</td>
                  <td>
                    {r.name}
                    <div className="small muted">{r.email}</div>
                  </td>
                  <td className="small">{r.use_case}</td>
                  <td style={{ textAlign: "right" }}>
                    <form action={removeWaitlistEntry}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message={`Remove ${r.email} from the waitlist?`}>Remove</ConfirmButton>
                    </form>
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
