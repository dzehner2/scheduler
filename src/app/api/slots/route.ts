import { NextResponse, type NextRequest } from "next/server";
import { busyTime, CalendarUnavailableError } from "@/lib/accounts";
import { db } from "@/lib/db";
import { getEventTypeBySlug, getSettings, rulesFor } from "@/lib/eventTypes";
import { generateSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

const MAX_RANGE = 35 * 24 * 3600_000;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const t = await getEventTypeBySlug(q.get("type") ?? "");
  if (!t || !t.active) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = Date.parse(q.get("start") ?? "");
  const end = Date.parse(q.get("end") ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > MAX_RANGE) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const settings = await getSettings();
  const now = Date.now();
  const from = Math.max(start, now);
  if (from >= end) return NextResponse.json({ slots: [] });

  try {
    const busy = await busyTime(from - 24 * 3600_000, end + 24 * 3600_000);
    const sql = await db();
    const same = await sql<{ start_at: Date }[]>`
      select start_at from bookings where status = 'confirmed' and event_type_id = ${t.id}
        and start_at >= ${new Date(from - 24 * 3600_000)} and start_at < ${new Date(end + 24 * 3600_000)}`;
    const slots = generateSlots({
      rules: rulesFor(t),
      timeZone: settings.time_zone,
      rangeStart: from,
      rangeEnd: end,
      now,
      busy,
      sameTypeBookingStarts: same.map((s) => s.start_at.getTime()),
    });
    return NextResponse.json(
      { slots: slots.map((s) => new Date(s).toISOString()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Availability check failed", err);
    const status = err instanceof CalendarUnavailableError ? 503 : 500;
    return NextResponse.json({ error: "Can't get through to the calendar right now. Please try again in a bit." }, { status });
  }
}
