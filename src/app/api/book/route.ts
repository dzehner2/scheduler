import { NextResponse, type NextRequest } from "next/server";
import { CalendarUnavailableError } from "@/lib/accounts";
import { BookingError, createBooking } from "@/lib/booking";
import { getEventTypeBySlug } from "@/lib/eventTypes";
import { recordUsage } from "@/lib/usage";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  // Honeypot: real people never fill this hidden field.
  if (body.website) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const t = await getEventTypeBySlug(body.u ? String(body.u) : null, String(body.type ?? ""));
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await recordUsage(t.user_id, "api");
  const start = Date.parse(String(body.start ?? ""));
  if (!Number.isFinite(start)) return NextResponse.json({ error: "Invalid time" }, { status: 400 });

  try {
    const b = await createBooking(t, start, {
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      notes: String(body.notes ?? ""),
      commonAnswer: String(body.commonAnswer ?? ""),
      meetingGoal: String(body.meetingGoal ?? ""),
      walkOk: body.walkOk === true,
    });
    return NextResponse.json({ id: b.id, token: b.cancel_token });
  } catch (err) {
    if (err instanceof BookingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Booking failed", err);
    const msg =
      err instanceof CalendarUnavailableError
        ? "We could not confirm availability right now. Please try again later."
        : "Something went wrong. Please try again.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
