import Link from "next/link";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import { siteOperator } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { name } = await siteOperator();
  const whose = name === "the owner of this site" ? "the owner's" : `${name}'s`;
  return (
    <>
      <main className="container narrow">
        <div className="card stack hero" style={{ marginTop: 56 }}>
          <Logo />
          <p className="lead">
            Remember when making plans was easy? We used to just call each other&apos;s landlines, or walk over and
            knock on the door.
          </p>
          <p className="lead">
            <strong>PlayDate is like that.</strong> Pick a time that works, and come on over.
          </p>
          <p>
            It checks {whose} Google calendars, across several Google accounts, and only offers times when the line
            is free. Once you pick one, a calendar invitation lands in your inbox.
          </p>
          <p className="muted">Got a link from someone? Use that link to pick a time. This page doesn&apos;t list them.</p>
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
