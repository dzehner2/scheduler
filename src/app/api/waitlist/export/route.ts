import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentOwner } from "@/lib/session";

const cell = (v: string) => {
  // Quote for CSV, and stop spreadsheet apps from treating text as a formula.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await currentOwner())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const sql = await db();
  const rows = await sql<{ name: string; email: string; use_case: string; created_at: Date }[]>`
    select name, email, use_case, created_at from waitlist order by created_at`;
  const csv = [
    "name,email,use_case,signed_up",
    ...rows.map((r) => [r.name, r.email, r.use_case, r.created_at.toISOString()].map(cell).join(",")),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="playdate-waitlist.csv"',
    },
  });
}
