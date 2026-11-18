"use client";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";

interface Props {
  id: string;
  token: string;
  title: string;
  start: string;
  cancelled: boolean;
  past: boolean;
  rebookPath: string | null;
  branded?: boolean;
}

export default function ManageBooking(p: Props) {
  const [zone, setZone] = useState("UTC");
  const [cancelled, setCancelled] = useState(p.cancelled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"), []);

  async function cancel(thenRebook: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, token: p.token }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Could not cancel.");
      return;
    }
    setCancelled(true);
    if (thenRebook && p.rebookPath) window.location.href = p.rebookPath;
  }

  const when = DateTime.fromISO(p.start, { zone }).toFormat("cccc, LLLL d, h:mm a");
  return (
    <div className="card stack" style={{ marginTop: 48 }}>
      <h1>{p.title}</h1>
      <p>
        {when} ({zone})
      </p>
      {error && <div className="alert error">{error}</div>}
      {cancelled ? (
        <>
          <div className="alert info">{p.branded ? "This meeting is cancelled." : "This play date is cancelled."}</div>
          {p.rebookPath && <a className="btn" href={p.rebookPath}>Book a new time</a>}
        </>
      ) : p.past ? (
        <p className="muted">This meeting has already happened.</p>
      ) : (
        <div className="row">
          {p.rebookPath && (
            <button className="btn" disabled={busy} onClick={() => cancel(true)}>
              Reschedule
            </button>
          )}
          <button className="btn danger" disabled={busy} onClick={() => cancel(false)}>
            Cancel meeting
          </button>
        </div>
      )}
      {!cancelled && !p.past && p.rebookPath && (
        <p className="small muted">Reschedule cancels this time, then lets you pick a new one.</p>
      )}
    </div>
  );
}
