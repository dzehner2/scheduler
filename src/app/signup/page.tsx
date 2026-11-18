import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import WaitlistForm from "@/components/WaitlistForm";
import { signupLimit, spotsLeft } from "@/lib/users";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Get your own PlayDate" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const coffee = process.env.COFFEE_URL;
  const coffeeOk = !!coffee && /^https:\/\/\S+$/.test(coffee);
  const [left, limit] = await Promise.all([spotsLeft(), signupLimit()]);

  return (
    <>
      <main className="container narrow">
        <div className="card stack hero" style={{ marginTop: 56 }}>
          <Logo />
          <h1 style={{ marginTop: 18 }}>Want your own PlayDate?</h1>
          <p className="lead">
            Back in the day you just called the landline or knocked on the door. PlayDate brings that back: one link,
            every calendar checked, no double bookings.
          </p>
          {error && <div className="alert error">{error}</div>}

          {left > 0 ? (
            <>
              <div className="spots">
                <span className="spots-count">{left}</span>
                <span>
                  of {limit} early {limit === 1 ? "spot" : "spots"} left. Grab one and you&apos;re in today.
                </span>
              </div>
              <p className="small muted">
                You sign in with Google and let PlayDate check your calendars for busy times. Google will say the app
                is not verified yet; that is expected for a small app. Click Advanced, then Go to PlayDate.
              </p>
              <div>
                <a className="btn" href="/api/auth/google?mode=signup">
                  Sign up with Google
                </a>
              </div>
              <p className="small muted">
                Already signed up? <a href="/login">Sign in</a>
              </p>
            </>
          ) : (
            <>
              <p>
                The early spots are taken. Leave your name and email and you&apos;ll hear when more open up. No spam,
                and your email is never shared.
              </p>
              <WaitlistForm coffeeUrl={coffeeOk ? coffee : null} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
