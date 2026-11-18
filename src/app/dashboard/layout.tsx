import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  const sql = await db();
  const broken = await sql<{ email: string; last_error: string | null }[]>`
    select email, last_error from accounts where status <> 'ok' order by email`;
  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from calendars where check_conflicts`;

  return (
    <>
      <nav className="nav">
        <div className="container">
          <strong>PlayDate</strong>
          <NavLinks />
          <form action="/api/auth/logout" method="post">
            <button className="linkbtn" title={owner}>Sign out</button>
          </form>
        </div>
      </nav>
      <main className="container">
        {broken.length > 0 && (
          <div className="alert error">
            <strong>Booking is paused.</strong> These Google accounts need to be reconnected before anyone can book,
            so nothing gets double-booked: {broken.map((b) => b.email).join(", ")}.{" "}
            <Link href="/dashboard/calendars">Reconnect now</Link>
          </div>
        )}
        {count === 0 && broken.length === 0 && (
          <div className="alert info">
            No calendars are being checked for conflicts yet. <Link href="/dashboard/calendars">Choose calendars</Link>
          </div>
        )}
        {children}
      </main>
    </>
  );
}
