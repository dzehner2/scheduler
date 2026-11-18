import Footer from "@/components/Footer";
import { LEGAL_UPDATED, siteOperator } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terms of service | PlayDate" };

export default async function Terms() {
  const { name, contact } = await siteOperator();
  return (
    <>
      <main className="container narrow">
        <div className="card stack" style={{ marginTop: 32 }}>
          <h1>Terms of service</h1>
          <p className="muted small">Last updated {LEGAL_UPDATED}</p>
          <p>
            PlayDate is a small booking service operated by {name}. By booking a time or creating an account, you agree
            to these terms.
          </p>
          <h2>Using PlayDate</h2>
          <ul>
            <li>Book only times you intend to keep, and give accurate contact details.</li>
            <li>Do not use PlayDate to send spam, make automated bookings, or disrupt the service.</li>
            <li>{name} may decline, cancel or reschedule any booking.</li>
          </ul>
          <h2>If you have a PlayDate account</h2>
          <ul>
            <li>You are responsible for your booking links and for the meetings booked through them.</li>
            <li>Only connect Google accounts you are allowed to use, and do not use PlayDate for spam or anything unlawful.</li>
            <li>
              PlayDate is a small, free service. {name} may change it, limit sign-ups, remove accounts that break these
              terms, or shut it down, and will try to give notice where possible.
            </li>
            <li>You can delete your account at any time from Calendars and settings.</li>
          </ul>
          <h2>Availability</h2>
          <p>
            PlayDate is provided as is, without warranties. Times shown depend on Google Calendar and may change.
            A booking is confirmed only when you see the confirmation and receive the calendar invitation.
          </p>
          <h2>Liability</h2>
          <p>
            To the extent the law allows, {name} is not liable for missed meetings, scheduling errors, or other
            losses from using PlayDate.
          </p>
          <h2>Privacy</h2>
          <p>
            How information is handled is described in the <a href="/privacy">privacy policy</a>.
          </p>
          <h2>Changes and contact</h2>
          <p>
            These terms may be updated; the date above shows the latest version. Questions:{" "}
            {contact ? <a href={`mailto:${contact}`}>{contact}</a> : name}.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
