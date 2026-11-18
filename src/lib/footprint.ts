/**
 * PlayDate's estimated energy and carbon footprint, and a suggested donation.
 *
 * Nobody publishes exact per-app energy data (not Vercel, not Neon, not the AI
 * provider used to build it), so every number here is an ESTIMATE built from
 * the stated assumptions below. Change the assumptions here; the pages show
 * them to users as-is.
 */

export const ASSUMPTIONS = {
  /**
   * Building PlayDate with an AI coding assistant: roughly 500 long requests
   * at about 5 Wh each with large context, plus test runs. Published estimates
   * for a single short chatbot answer are around 0.3 Wh (Epoch AI, 2025); long
   * coding requests use far more. Uncertainty is wide: 1 to 10 kWh.
   */
  buildKwh: 3,
  /** Hosting baseline: database compute, deploy builds, idle functions. */
  baselineKwhPerMonth: 0.5,
  /** Average data sent per page view, in GB (about 0.5 MB). */
  pageViewGb: 0.0005,
  /** Average data per API call, in GB (about 5 KB). */
  apiCallGb: 0.000005,
  /** Energy per GB transferred, covering data centers, networks and devices (Sustainable Web Design model v3). */
  kwhPerGb: 0.81,
  /** Global average grid carbon intensity, kg CO2e per kWh (Ember, Global Electricity Review 2024). */
  kgCo2PerKwh: 0.48,
  /** Price used to turn carbon into dollars: US EPA social cost of carbon, central estimate (2023), $ per tonne. */
  dollarsPerTonne: 190,
};

export const DONATE = {
  name: "One Tree Planted",
  url: "https://onetreeplanted.org/",
  /** One Tree Planted's own pledge: one dollar plants one tree. */
  dollarsPerTree: 1,
};

export interface Usage {
  pageViews: number;
  apiCalls: number;
}

export interface Footprint {
  kwh: number;
  kgCo2: number;
  /** Suggested donation in US cents (the carbon cost, not rounded up). */
  cents: number;
}

export function usageKwh(u: Usage, a = ASSUMPTIONS): number {
  return (u.pageViews * a.pageViewGb + u.apiCalls * a.apiCallGb) * a.kwhPerGb;
}

export function footprintOf(kwh: number, a = ASSUMPTIONS): Footprint {
  const kgCo2 = kwh * a.kgCo2PerKwh;
  const cents = Math.round(((kgCo2 / 1000) * a.dollarsPerTonne) * 100);
  return { kwh, kgCo2, cents };
}

/** Months the app has been running, at least 1 (partial months count). */
export function monthsLive(since: Date, now = new Date()): number {
  const ms = now.getTime() - since.getTime();
  return Math.max(1, Math.ceil(ms / (30.44 * 24 * 3600_000)));
}

/**
 * A user's share: their own usage, plus an equal slice of the shared build
 * and hosting baseline.
 */
export function userShareKwh(own: Usage, userCount: number, months: number, a = ASSUMPTIONS): number {
  const shared = a.buildKwh + a.baselineKwhPerMonth * months;
  return usageKwh(own, a) + shared / Math.max(1, userCount);
}

/** Total for the whole app. */
export function totalKwh(all: Usage, months: number, a = ASSUMPTIONS): number {
  return a.buildKwh + a.baselineKwhPerMonth * months + usageKwh(all, a);
}

/** Round a suggestion up to whole trees (at least one). */
export function roundUpToTrees(cents: number): { trees: number; dollars: number } {
  const trees = Math.max(1, Math.ceil(cents / 100 / DONATE.dollarsPerTree));
  return { trees, dollars: trees * DONATE.dollarsPerTree };
}

export const fmtKwh = (k: number) => (k < 1 ? `${(k * 1000).toFixed(0)} Wh` : `${k.toFixed(k < 10 ? 2 : 1)} kWh`);
export const fmtKg = (kg: number) => (kg < 1 ? `${(kg * 1000).toFixed(0)} g` : `${kg.toFixed(2)} kg`);
export const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`;
