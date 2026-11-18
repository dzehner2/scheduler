import { db } from "@/lib/db";
import { getSettings } from "@/lib/eventTypes";
import ConfirmButton from "@/components/ConfirmButton";
import { disconnectAccount, refreshCalendars, saveSettings, toggleCalendar } from "../actions";

interface Row {
  account_id: number;
  email: string;
  status: string;
  last_error: string | null;
  google_id: string | null;
  summary: string | null;
  color: string | null;
  access_role: string | null;
  check_conflicts: boolean | null;
}

export default async function Calendars({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; connected?: string }>;
}) {
  const { error, saved, connected } = await searchParams;
  const sql = await db();
  const settings = await getSettings();
  const rows = await sql<Row[]>`
    select a.id as account_id, a.email, a.status, a.last_error, c.google_id, c.summary, c.color, c.access_role, c.check_conflicts
    from accounts a left join calendars c on c.account_id = a.id
    order by a.created_at, a.email, (c.google_id = a.email) desc, c.summary`;

  const accounts = new Map<number, { email: string; status: string; last_error: string | null; cals: Row[] }>();
  for (const r of rows) {
    const a = accounts.get(r.account_id) ?? { email: r.email, status: r.status, last_error: r.last_error, cals: [] };
    if (r.google_id) a.cals.push(r);
    accounts.set(r.account_id, a);
  }
  const writable = rows.filter((r) => r.google_id && (r.access_role === "owner" || r.access_role === "writer"));
  const zones = Intl.supportedValuesOf("timeZone");

  return (
    <>
      <h1>Calendars and settings</h1>
      <p className="muted">
        Every checked calendar, on every connected account, is treated as busy. Times are only offered when all of
        them are free.
      </p>
      {error && <div className="alert error">{error}</div>}
      {saved && <div className="alert ok">Settings saved.</div>}
      {connected && <div className="alert ok">Connected {connected}.</div>}

      {[...accounts].map(([id, a]) => (
        <div className="card" key={id}>
          <div className="row spread" style={{ marginBottom: 12 }}>
            <div className="row">
              <h2 style={{ margin: 0 }}>{a.email}</h2>
              {a.status === "ok" ? <span className="badge ok">Connected</span> : <span className="badge error">Reconnect needed</span>}
            </div>
            <div className="row">
              {a.status !== "ok" && (
                <a className="btn small" href={`/api/auth/google?mode=connect&hint=${encodeURIComponent(a.email)}`}>
                  Reconnect
                </a>
              )}
              <form action={refreshCalendars}>
                <input type="hidden" name="accountId" value={id} />
                <button className="btn secondary small">Refresh list</button>
              </form>
              <form action={disconnectAccount}>
                <input type="hidden" name="accountId" value={id} />
                <ConfirmButton message={`Disconnect ${a.email}? Its calendars will no longer be checked.`}>Disconnect</ConfirmButton>
              </form>
            </div>
          </div>
          {a.last_error && a.status !== "ok" && <div className="alert error small">{a.last_error}</div>}
          <table>
            <tbody>
              {a.cals.map((c) => (
                <tr key={c.google_id}>
                  <td style={{ width: 24 }}>
                    <span className="swatch" style={{ background: c.color ?? "#999" }} />
                  </td>
                  <td>
                    {c.summary}
                    {c.access_role === "freeBusyReader" || c.access_role === "reader" ? (
                      <span className="small muted"> (shared with you)</span>
                    ) : null}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <form action={toggleCalendar} className="row" style={{ justifyContent: "flex-end" }}>
                      <input type="hidden" name="accountId" value={id} />
                      <input type="hidden" name="googleId" value={c.google_id!} />
                      <input type="hidden" name="checked" value={c.check_conflicts ? "0" : "1"} />
                      <span className={c.check_conflicts ? "badge ok" : "badge"}>
                        {c.check_conflicts ? "Checked for conflicts" : "Ignored"}
                      </span>
                      <button className="btn secondary small">{c.check_conflicts ? "Ignore" : "Check"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="card">
        <h2>Connect another Google account</h2>
        <p className="muted">
          Add each Google account whose calendars should block your availability, for example a work account and a
          personal account. You will be asked to choose the account at Google.
        </p>
        <a className="btn" href="/api/auth/google?mode=connect">
          Connect a Google account
        </a>
      </div>

      <form className="card stack" action={saveSettings}>
        <h2>Settings</h2>
        <div className="grid2">
          <div>
            <label htmlFor="display_name">Your name on the booking page</label>
            <input id="display_name" name="display_name" type="text" defaultValue={settings.display_name} />
          </div>
          <div>
            <label htmlFor="time_zone">Your time zone</label>
            <select id="time_zone" name="time_zone" defaultValue={settings.time_zone}>
              {zones.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
            <div className="hint">Your working hours are read in this time zone. Guests see times in their own.</div>
          </div>
        </div>
        <div>
          <label htmlFor="booking_calendar">Put new bookings on</label>
          <select
            id="booking_calendar"
            name="booking_calendar"
            defaultValue={`${settings.booking_account_id}|${settings.booking_calendar_id}`}
          >
            {writable.map((c) => (
              <option key={`${c.account_id}|${c.google_id}`} value={`${c.account_id}|${c.google_id}`}>
                {c.summary} ({c.email})
              </option>
            ))}
          </select>
          <div className="hint">
            The invite to your guest comes from this calendar. It is always checked for conflicts.
          </div>
        </div>
        <div>
          <button className="btn">Save settings</button>
        </div>
      </form>
    </>
  );
}
