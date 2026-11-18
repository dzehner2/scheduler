"use client";
import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Props {
  slug: string;
  title: string;
  description: string;
  hostName: string;
  durationMin: number;
  location: string;
  needsPhone: boolean;
  maxDaysAhead: number;
}

type Step = "pick" | "form" | "done";

export default function BookingWidget(p: Props) {
  const [zone, setZone] = useState<string>("UTC");
  const [zones, setZones] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<DateTime | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; token: string } | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(6);

  // Detect the guest's time zone on the client only.
  useEffect(() => {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setZone(z);
    setZones(Intl.supportedValuesOf("timeZone"));
    setWeekStart(DateTime.now().setZone(z).startOf("day"));
  }, []);

  const today = useMemo(() => DateTime.now().setZone(zone).startOf("day"), [zone]);
  const lastDay = today.plus({ days: p.maxDaysAhead + 1 });

  const load = useCallback(async (start: DateTime) => {
    setSlots(null);
    setLoadError(null);
    const end = start.plus({ days: 7 });
    try {
      const res = await fetch(
        `/api/slots?type=${encodeURIComponent(p.slug)}&start=${encodeURIComponent(start.toUTC().toISO()!)}&end=${encodeURIComponent(end.toUTC().toISO()!)}`,
        { cache: "no-store" },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not load times.");
      setSlots(body.slots);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load times.");
      setSlots([]);
    }
  }, [p.slug]);

  useEffect(() => {
    if (weekStart) load(weekStart);
  }, [weekStart, load]);

  const days = useMemo(() => {
    if (!weekStart) return [];
    return Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }));
  }, [weekStart]);

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots ?? []) {
      const key = DateTime.fromISO(s, { zone }).toISODate()!;
      m.set(key, [...(m.get(key) ?? []), s]);
    }
    return m;
  }, [slots, zone]);

  // Pick the first day with times, or jump ahead a week if this week is empty.
  useEffect(() => {
    if (!slots || !weekStart) return;
    const first = days.find((d) => byDay.has(d.toISODate()!));
    if (first) {
      setDay((cur) => (cur && byDay.has(cur) ? cur : first.toISODate()));
    } else if (!loadError && autoAdvance > 0 && weekStart.plus({ days: 7 }) < lastDay) {
      setAutoAdvance((n) => n - 1);
      setWeekStart(weekStart.plus({ days: 7 }));
    } else {
      setDay(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const canPrev = weekStart ? weekStart > today : false;
  const canNext = weekStart ? weekStart.plus({ days: 7 }) < lastDay : false;
  const fmtTime = (iso: string) => DateTime.fromISO(iso, { zone }).toFormat("h:mm a");
  const fmtFull = (iso: string) => DateTime.fromISO(iso, { zone }).toFormat("cccc, LLLL d, h:mm a");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(f), type: p.slug, start: slot }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error || "Could not book.");
        if (res.status === 409 && weekStart) {
          setStep("pick");
          setSlot(null);
          load(weekStart);
        }
        return;
      }
      setResult(body);
      setStep("done");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card booking">
      <div className="info">
        {p.hostName && <div className="muted">{p.hostName}</div>}
        <h1>{p.title}</h1>
        <p className="muted">
          {p.durationMin} minutes
          <br />
          {p.location}
        </p>
        {p.description && <p style={{ whiteSpace: "pre-wrap" }}>{p.description}</p>}
        {slot && step !== "pick" && <p><strong>{fmtFull(slot)}</strong></p>}
      </div>

      <div className="pick">
        {step === "pick" && (
          <>
            <div className="row spread" style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Pick a time</h2>
              <div className="row">
                <button className="btn secondary small" disabled={!canPrev} onClick={() => weekStart && setWeekStart(weekStart.minus({ days: 7 }))}>
                  Previous
                </button>
                <button className="btn secondary small" disabled={!canNext} onClick={() => { setAutoAdvance(0); if (weekStart) setWeekStart(weekStart.plus({ days: 7 })); }}>
                  Next
                </button>
              </div>
            </div>
            {formError && <div className="alert error">{formError}</div>}
            <div className="days">
              {days.map((d) => {
                const key = d.toISODate()!;
                const has = byDay.has(key);
                return (
                  <button key={key} className={`day${has ? " has" : ""}${day === key ? " sel" : ""}`} disabled={!has} onClick={() => setDay(key)}>
                    <small>{d.toFormat("ccc")}</small>
                    {d.toFormat("d")}
                    <small>{d.toFormat("LLL")}</small>
                  </button>
                );
              })}
            </div>
            {slots === null && <p className="muted">Checking availability...</p>}
            {loadError && <div className="alert error">{loadError}</div>}
            {slots !== null && !loadError && byDay.size === 0 && <p className="muted">No open times this week. Try the next week.</p>}
            {day && byDay.get(day) && (
              <div className="times">
                {byDay.get(day)!.map((s) => (
                  <button key={s} className="time" onClick={() => { setSlot(s); setStep("form"); setFormError(null); }}>
                    {fmtTime(s)}
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <label htmlFor="tz" className="small">Time zone</label>
              <select id="tz" value={zone} onChange={(e) => setZone(e.target.value)} style={{ maxWidth: 320 }}>
                {(zones.includes(zone) ? zones : [zone, ...zones]).map((z) => <option key={z}>{z}</option>)}
              </select>
            </div>
          </>
        )}

        {step === "form" && slot && (
          <form onSubmit={submit} className="stack">
            <button type="button" className="linkbtn" onClick={() => setStep("pick")}>Back</button>
            <h2>Your details</h2>
            {formError && <div className="alert error">{formError}</div>}
            <div>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" required maxLength={120} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" />
              <div className="hint">The calendar invite is sent here.</div>
            </div>
            {p.needsPhone && (
              <div>
                <label htmlFor="phone">Phone number</label>
                <input id="phone" name="phone" type="tel" required autoComplete="tel" />
              </div>
            )}
            <div>
              <label htmlFor="notes">Anything to share before we meet? (optional)</label>
              <textarea id="notes" name="notes" maxLength={2000} />
            </div>
            <div className="hp" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <div>
              <button className="btn" disabled={submitting}>{submitting ? "Booking..." : "Confirm booking"}</button>
            </div>
          </form>
        )}

        {step === "done" && slot && result && (
          <div className="stack">
            <div className="alert ok">You are booked.</div>
            <p>
              <strong>{p.title}</strong>
              <br />
              {fmtFull(slot)} ({zone})
            </p>
            <p className="muted">A calendar invitation is on its way to your email.</p>
            <p className="small">
              Need to change it? <a href={`/booking/${result.id}?t=${result.token}`}>Cancel or reschedule</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
