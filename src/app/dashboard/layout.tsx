import Link from "next/link";
import Logo from "@/components/Logo";
import NavLinks from "@/components/NavLinks";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/eventTypes";
import { requireUser } from "@/lib/session";
import { vibeOrDefault } from "@/lib/vibes";
import CheckInCard from "@/components/CheckInCard";
import { todaysCheckIn } from "@/lib/checkins";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const mySettings = await getSettings(me.id);
  const vibe = vibeOrDefault(mySettings.vibe);
  const checkIn = mySettings.favorite_show ? await todaysCheckIn(me.id) : null;
  const sql = await db();
  const broken = await sql<{ email: string; last_error: string | null }[]>`
    select email, last_error from accounts where status <> 'ok' and user_id = ${me.id} order by email`;
  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from calendars c join accounts a on a.id = c.account_id where c.check_conflicts and a.user_id = ${me.id}`;

  return (
    <div className={`vibe-${vibe}`}>
      <nav className="nav">
        <div className="container">
          <Link href="/dashboard" className="navlogo"><Logo size="sm" /></Link>
          <NavLinks admin={me.role === "admin"} />
          <form action="/api/auth/logout" method="post">
            <button className="linkbtn" title={me.email}>Sign out</button>
          </form>
        </div>
      </nav>
      <div className="workspace">
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
        {!mySettings.favorite_show && (
          <div className="alert info">
            Quick question: what&apos;s your favorite &apos;80s or &apos;90s show or cartoon?{" "}
            <Link href="/dashboard/welcome">Answer it and get your page vibe</Link>
          </div>
        )}
        {mySettings.favorite_show && !checkIn && <CheckInCard />}
        {children}
      </main>
      </div>
    </div>
  );
}
