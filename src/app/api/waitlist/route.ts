import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || body.website) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const useCase = String(body.useCase ?? "").trim();
  if (!name || name.length > 120) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (useCase.length > 500) return NextResponse.json({ error: "Please keep it under 500 characters." }, { status: 400 });

  const sql = await db();
  // Signing up twice is fine: keep the first entry, and do not reveal whether an email is already listed.
  await sql`insert into waitlist (name, email, use_case) values (${name}, ${email}, ${useCase}) on conflict (email) do nothing`;
  return NextResponse.json({ ok: true });
}
