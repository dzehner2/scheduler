import { db } from "./db";
import { footprintOf, monthsLive, totalKwh, userShareKwh, type Footprint, type Usage } from "./footprint";

/**
 * Count a page view or API call against a user, for the footprint estimate.
 * Counts only: no IP addresses, no visitor details. Never throws.
 */
export async function recordUsage(userId: number | null | undefined, kind: "page" | "api"): Promise<void> {
  if (!userId) return;
  try {
    const sql = await db();
    const page = kind === "page" ? 1 : 0;
    const api = kind === "api" ? 1 : 0;
    await sql`
      insert into usage_daily (user_id, day, page_views, api_calls) values (${userId}, current_date, ${page}, ${api})
      on conflict (user_id, day) do update set
        page_views = usage_daily.page_views + excluded.page_views,
        api_calls = usage_daily.api_calls + excluded.api_calls`;
  } catch {
    // Footprint counting must never break a page.
  }
}

export interface FootprintReport {
  months: number;
  users: number;
  total: Footprint & Usage;
  mine?: Footprint & Usage;
}

/** Whole-app totals, and optionally one user's share. */
export async function footprintReport(userId?: number): Promise<FootprintReport> {
  const sql = await db();
  const [{ users, since }] = await sql<{ users: number; since: Date | null }[]>`
    select count(*)::int as users, min(created_at) as since from users`;
  const months = monthsLive(since ?? new Date());
  const [all] = await sql<{ pv: number; api: number }[]>`
    select coalesce(sum(page_views), 0)::int as pv, coalesce(sum(api_calls), 0)::int as api from usage_daily`;
  const allUsage = { pageViews: all.pv, apiCalls: all.api };
  const report: FootprintReport = {
    months,
    users,
    total: { ...footprintOf(totalKwh(allUsage, months)), ...allUsage },
  };
  if (userId) {
    const [me] = await sql<{ pv: number; api: number }[]>`
      select coalesce(sum(page_views), 0)::int as pv, coalesce(sum(api_calls), 0)::int as api
      from usage_daily where user_id = ${userId}`;
    const mine = { pageViews: me.pv, apiCalls: me.api };
    report.mine = { ...footprintOf(userShareKwh(mine, users, months)), ...mine };
  }
  return report;
}
