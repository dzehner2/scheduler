import { ASSUMPTIONS as A, DONATE } from "@/lib/footprint";

/** The assumptions behind every footprint number, shown in plain language. */
export default function FootprintMethod() {
  return (
    <div className="card stack">
      <h2>How this is estimated</h2>
      <p className="small muted">
        No hosting or AI provider publishes exact energy use for a single app, so these are estimates from published
        averages. They are meant to be honest and roughly right, not precise.
      </p>
      <table className="small">
        <tbody>
          <tr>
            <td>Building PlayDate with an AI coding assistant</td>
            <td>
              about {A.buildKwh} kWh (could be 1 to 10). Roughly 500 long requests at about 5 Wh each; a short chatbot
              answer is about 0.3 Wh (Epoch AI, 2025).
            </td>
          </tr>
          <tr>
            <td>Hosting, database and deploys</td>
            <td>about {A.baselineKwhPerMonth} kWh per month</td>
          </tr>
          <tr>
            <td>Each page view / each availability or booking request</td>
            <td>
              about {A.pageViewGb * 1000} MB / {A.apiCallGb * 1_000_000} KB of data, at {A.kwhPerGb} kWh per GB
              (Sustainable Web Design model v3, which covers data centers, networks and devices)
            </td>
          </tr>
          <tr>
            <td>Carbon per kWh</td>
            <td>{A.kgCo2PerKwh} kg CO2e, the global grid average (Ember, Global Electricity Review 2024)</td>
          </tr>
          <tr>
            <td>Suggested donation</td>
            <td>
              ${A.dollarsPerTonne} per tonne of CO2e, the US EPA&apos;s central social cost of carbon estimate (2023)
            </td>
          </tr>
          <tr>
            <td>Your share</td>
            <td>your own page views and requests, plus an equal slice of building and hosting</td>
          </tr>
        </tbody>
      </table>
      <p className="small muted">
        Planting trees is not an exact offset: trees take years to grow and absorb carbon. {DONATE.name} plants one
        tree for every dollar, which is a meaningful way to give back for the resources PlayDate uses. PlayDate never
        handles donations; the button goes straight to their site.
      </p>
    </div>
  );
}
