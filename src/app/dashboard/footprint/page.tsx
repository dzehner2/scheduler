import DonateBox from "@/components/DonateBox";
import FootprintMethod from "@/components/FootprintMethod";
import { fmtKg, fmtKwh } from "@/lib/footprint";
import { requireUser } from "@/lib/session";
import { footprintReport } from "@/lib/usage";

export default async function MyFootprint() {
  const me = await requireUser();
  const r = await footprintReport(me.id);
  const mine = r.mine!;
  return (
    <>
      <h1>Your footprint</h1>
      <p className="muted small">An estimate of the energy behind your PlayDate, and a simple way to give back.</p>
      <div className="card stack">
        <div className="stats">
          <div className="stat">
            <span className="stat-num">{fmtKwh(mine.kwh)}</span>
            <span className="stat-label">estimated energy</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtKg(mine.kgCo2)}</span>
            <span className="stat-label">estimated CO2e</span>
          </div>
          <div className="stat">
            <span className="stat-num">{mine.pageViews + mine.apiCalls}</span>
            <span className="stat-label">page views and requests</span>
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Your share includes 1/{r.users} of building and hosting PlayDate ({r.months}{" "}
          {r.months === 1 ? "month" : "months"} so far). Whole app: {fmtKwh(r.total.kwh)}, {fmtKg(r.total.kgCo2)} CO2e.
        </p>
        <DonateBox cents={mine.cents} who="you" />
      </div>
      <FootprintMethod />
    </>
  );
}
