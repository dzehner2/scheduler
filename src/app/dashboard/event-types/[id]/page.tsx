import { notFound } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import { getEventType, type EventType } from "@/lib/eventTypes";
import { deleteEventType, saveEventType } from "../../actions";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULTS: Omit<EventType, "id"> = {
  slug: "",
  title: "",
  description: "",
  duration_min: 30,
  buffer_before_min: 0,
  buffer_after_min: 10,
  min_notice_min: 240,
  max_days_ahead: 30,
  slot_interval_min: 30,
  daily_cap: null,
  weekly_hours: Object.fromEntries([1, 2, 3, 4, 5].map((d) => [d, [{ start: "09:00", end: "17:00" }]])),
  location_type: "meet",
  location_detail: "",
  active: true,
};

export default async function EditEventType({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const existing = id === "new" ? null : await getEventType(Number(id));
  if (id !== "new" && !existing) notFound();
  const t = existing ?? { ...DEFAULTS, id: 0 };

  return (
    <>
      <h1>{existing ? "Edit booking link" : "New booking link"}</h1>
      {error && <div className="alert error">{error}</div>}
      <form action={saveEventType} className="stack">
        {existing && <input type="hidden" name="id" value={existing.id} />}
        <div className="card stack">
          <div className="grid2">
            <div>
              <label htmlFor="title">Name</label>
              <input id="title" name="title" type="text" required defaultValue={t.title} placeholder="Intro call" />
            </div>
            <div>
              <label htmlFor="slug">Link address</label>
              <input id="slug" name="slug" type="text" required defaultValue={t.slug} placeholder="intro" pattern="[a-z0-9][a-z0-9\-]{1,48}" />
              <div className="hint">Lowercase letters, numbers and dashes. Becomes yoursite/intro</div>
            </div>
          </div>
          <div>
            <label htmlFor="description">Description for guests</label>
            <textarea id="description" name="description" defaultValue={t.description} />
          </div>
          <div className="grid2">
            <div>
              <label htmlFor="duration_min">Length (minutes)</label>
              <input id="duration_min" name="duration_min" type="number" min={5} max={480} defaultValue={t.duration_min} />
            </div>
            <div>
              <label htmlFor="location_type">Where</label>
              <select id="location_type" name="location_type" defaultValue={t.location_type}>
                <option value="meet">Google Meet (link added automatically)</option>
                <option value="phone">Phone call (guest gives their number)</option>
                <option value="in_person">In person</option>
                <option value="custom">Other (describe below)</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="location_detail">Address or details</label>
            <input id="location_detail" name="location_detail" type="text" defaultValue={t.location_detail} />
            <div className="hint">Used for In person and Other.</div>
          </div>
          <label className="row" style={{ fontWeight: 400 }}>
            <input type="checkbox" name="active" defaultChecked={t.active} /> Link is on (guests can book)
          </label>
        </div>

        <div className="card stack">
          <h2>When you are available</h2>
          <p className="muted small">
            Hours in your time zone. Anything on a checked calendar inside these hours still blocks the time.
          </p>
          {DAYS.map((name, i) => {
            const d = (i + 1) as 1;
            const w = t.weekly_hours[d]?.[0];
            return (
              <div className="row" key={d}>
                <label className="row" style={{ width: 140, margin: 0, fontWeight: 400 }}>
                  <input type="checkbox" name={`day_${d}_on`} defaultChecked={!!w} /> {name}
                </label>
                <input type="time" name={`day_${d}_start`} defaultValue={w?.start ?? "09:00"} style={{ width: 130 }} aria-label={`${name} start`} />
                <span className="muted">to</span>
                <input type="time" name={`day_${d}_end`} defaultValue={w?.end ?? "17:00"} style={{ width: 130 }} aria-label={`${name} end`} />
              </div>
            );
          })}
        </div>

        <div className="card stack">
          <h2>Limits</h2>
          <div className="grid2">
            <div>
              <label htmlFor="buffer_before_min">Buffer before (minutes)</label>
              <input id="buffer_before_min" name="buffer_before_min" type="number" min={0} max={240} defaultValue={t.buffer_before_min} />
            </div>
            <div>
              <label htmlFor="buffer_after_min">Buffer after (minutes)</label>
              <input id="buffer_after_min" name="buffer_after_min" type="number" min={0} max={240} defaultValue={t.buffer_after_min} />
            </div>
            <div>
              <label htmlFor="min_notice_hours">Minimum notice (hours)</label>
              <input id="min_notice_hours" name="min_notice_hours" type="number" min={0} max={720} step="0.5" defaultValue={t.min_notice_min / 60} />
            </div>
            <div>
              <label htmlFor="max_days_ahead">How far ahead guests can book (days)</label>
              <input id="max_days_ahead" name="max_days_ahead" type="number" min={1} max={365} defaultValue={t.max_days_ahead} />
            </div>
            <div>
              <label htmlFor="slot_interval_min">Offer start times every (minutes)</label>
              <input id="slot_interval_min" name="slot_interval_min" type="number" min={5} max={240} defaultValue={t.slot_interval_min} />
            </div>
            <div>
              <label htmlFor="daily_cap">Max bookings per day</label>
              <input id="daily_cap" name="daily_cap" type="number" min={1} max={50} defaultValue={t.daily_cap ?? ""} placeholder="No limit" />
            </div>
          </div>
        </div>

        <div className="row spread">
          <button className="btn">Save</button>
        </div>
      </form>
      {existing && (
        <form action={deleteEventType} style={{ marginTop: 24 }}>
          <input type="hidden" name="id" value={existing.id} />
          <ConfirmButton message="Delete this booking link? Existing bookings stay on your calendar.">Delete booking link</ConfirmButton>
        </form>
      )}
    </>
  );
}
