import Link from "next/link";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import QuoteRotator from "@/components/QuoteRotator";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <>
      <main className="container narrow">
        <div className="card stack hero" style={{ marginTop: 56 }}>
          <Logo />
          <QuoteRotator />
          <p className="lead">
            Remember when making plans was easy? We used to just call each other&apos;s landlines, or walk over and
            knock on the door.
          </p>
          <p className="lead">
            <strong>PlayDate is like that.</strong> Pick a time that works, and come on over.
          </p>
          <p>
            PlayDate checks all of your calendars, across all of your Google accounts, and only offers times when
            the line is free. Share one link, and when someone picks a time, the invitation lands in both inboxes.
          </p>
          <p className="muted">Got a link from someone? Use that link to pick a time. This page doesn&apos;t list them.</p>
          <p className="small">
            <Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms of service</Link> · <Link href="/signup">Get your own PlayDate</Link> ·{" "}
            <Link href="/login">Sign in</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
