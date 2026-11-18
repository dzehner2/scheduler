import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import WaitlistForm from "@/components/WaitlistForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Get your own PlayDate" };

export default function Signup() {
  const coffee = process.env.COFFEE_URL;
  const coffeeOk = coffee && /^https:\/\/\S+$/.test(coffee);
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
          <p>
            It&apos;s a one-person project for now. Leave your name and email and you&apos;ll hear when spots open
            up. No spam, and your email is never shared.
          </p>
          <WaitlistForm />
        </div>

        {coffeeOk && (
          <div className="card stack coffee">
            <h2>Like what you see?</h2>
            <p>PlayDate is free. If it saved you a phone tag or two, you can buy the maker a coffee.</p>
            <a className="btn coffee-btn" href={coffee} target="_blank" rel="noopener noreferrer">
              Buy me a coffee
            </a>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
