import Link from "next/link";
import CopyLink from "@/components/CopyLink";
import { config } from "@/lib/config";
import { listEventTypes, locationLabel } from "@/lib/eventTypes";

export default async function EventTypes({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const types = await listEventTypes();
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
        const url = `${config.appUrl}/${t.slug}`;
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
              </div>
              <a className="small" href={`/${t.slug}`} target="_blank">
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
