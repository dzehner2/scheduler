import type { Metadata } from "next";
import DonateBox from "@/components/DonateBox";
import Footer from "@/components/Footer";
import FootprintMethod from "@/components/FootprintMethod";
import Logo from "@/components/Logo";
import { fmtKg, fmtKwh } from "@/lib/footprint";
import { footprintReport } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "PlayDate footprint" };

export default async function PublicFootprint() {
  const r = await footprintReport();
  return (
    <>
      <main className="container narrow">
        <div className="card stack hero" style={{ marginTop: 40 }}>
          <Logo />
          <h1 style={{ marginTop: 16 }}>Our footprint</h1>
          <p>
            Everything online runs on electricity, including this little app. Here&apos;s our best estimate of what it
            has used so far, and an easy way to plant some trees in return.
          </p>
          <div className="stats">
            <div className="stat">
              <span className="stat-num">{fmtKwh(r.total.kwh)}</span>
              <span className="stat-label">estimated energy</span>
            </div>
            <div className="stat">
              <span className="stat-num">{fmtKg(r.total.kgCo2)}</span>
              <span className="stat-label">estimated CO2e</span>
            </div>
            <div className="stat">
              <span className="stat-num">{r.total.pageViews + r.total.apiCalls}</span>
              <span className="stat-label">page views and requests</span>
            </div>
          </div>
          <DonateBox cents={r.total.cents} who="app" />
        </div>
        <FootprintMethod />
      </main>
      <Footer />
    </>
  );
}
