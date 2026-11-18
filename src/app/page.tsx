import Link from "next/link";
import Footer from "@/components/Footer";
import { siteOperator } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { name } = await siteOperator();
  return (
    <>
      <main className="container narrow">
        <div className="card stack" style={{ marginTop: 64 }}>
          <h1>PlayDate</h1>
          <p>Come over for a play date! PlayDate is a personal booking page, run by {name}.</p>
          <p>
            It checks {name === "the owner of this site" ? "the owner's" : `${name}'s`} Google calendars, across
            several Google accounts, and only offers times when every one of them is free. When you pick a time, it
            adds the meeting to the calendar and Google sends you an invitation.
          </p>
          <p className="muted">
            If someone sent you a booking link, open that link to choose a time. This page does not list booking
            links.
          </p>
          <p className="small">
            <Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms of service</Link> ·{" "}
            <Link href="/login">Owner sign in</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
