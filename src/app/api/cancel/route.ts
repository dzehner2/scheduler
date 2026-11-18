import { NextResponse, type NextRequest } from "next/server";
import { cancelBooking, getBooking, tokenMatches } from "@/lib/booking";

export async function POST(req: NextRequest) {
  const { id, token } = (await req.json().catch(() => ({}))) as { id?: string; token?: string };
  const b = id ? await getBooking(id) : null;
  if (!b || !tokenMatches(b, token)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await cancelBooking(b);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cancel failed", err);
    return NextResponse.json({ error: "Could not cancel right now. Please try again." }, { status: 503 });
  }
}
