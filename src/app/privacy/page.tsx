import Footer from "@/components/Footer";
import { LEGAL_UPDATED, siteOperator } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy policy | PlayDate" };

export default async function Privacy() {
  const { name, contact } = await siteOperator();
  return (
    <>
      <main className="container narrow">
        <div className="card stack" style={{ marginTop: 32 }}>
          <h1>Privacy policy</h1>
          <p className="muted small">Last updated {LEGAL_UPDATED}</p>
          <p>
            PlayDate is a small scheduling service operated by {name}. A few people have their own PlayDate account
            and booking links. This policy explains what information PlayDate uses and why.
          </p>

          <h2>Information from Google accounts</h2>
          <p>
            Each PlayDate user connects their own Google accounts. A user&apos;s calendar data is used only to run that
            user&apos;s own booking pages, and is never shown to other users. For each connected account, PlayDate:
          </p>
          <ul>
            <li>reads the account&apos;s email address, to know which account is connected and to sign you in;</li>
            <li>reads the list of calendars, so the owner can choose which ones count as busy;</li>
            <li>reads free and busy times on the chosen calendars. It does not read event titles, descriptions or attendees;</li>
            <li>creates, and on cancellation deletes, booking events on the one calendar the owner picks for bookings.</li>
          </ul>
          <p>
            Google access tokens are stored encrypted. PlayDate does not sell this information, share it with
            anyone, use it for advertising, or use it to train AI models. It is used only to show available times
            and record bookings.
          </p>
          <p>
            PlayDate&apos;s use of information received from Google APIs adheres to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <h2>Information from people who book</h2>
          <p>
            When you book a time, you give your name, email address, and, if you choose or the meeting requires it,
            a phone number and notes. This is stored so the meeting can be scheduled, shown to {name}, and included
            in the calendar invitation Google sends you. It is visible only to the person whose link you used. It is
            not sold, shared with third parties, or used for marketing lists.
          </p>

          <h2>PlayDate accounts</h2>
          <p>
            If you sign up, PlayDate stores your email, your PlayDate address, your settings, and, if you share it,
            your favorite show (used only to pick your page style). The operator can see account emails and how many
            links and bookings each account has, but not your calendars or booking details. You can delete your
            account at any time from Calendars and settings; this removes your connected accounts, links and booking
            records from PlayDate.
          </p>

          <h2>How you are feeling</h2>
          <p>
            Some booking pages ask guests how they are feeling so PlayDate can suggest a small tip. That answer stays in the
            guest&apos;s browser: it is never sent to PlayDate, saved, or shown to anyone.
          </p>
          <p>
            Account holders can do a private daily check-in (energy, stress and mood on a 1 to 5 scale). It is stored
            only to show that person their own tip, is never shown to anyone else, including the operator, and is
            deleted after 30 days.
          </p>

          <p>
            Some booking links also invite guests to share optional extras: an answer to a fun question (like a
            favorite sports team), what would make the meeting great, or that they are up for a walking call. If a
            guest fills these in, they are saved with the booking and shown only to the person whose link they used.
          </p>

          <h2>Footprint estimate</h2>
          <p>
            To estimate PlayDate&apos;s energy use, it counts page views and requests per account per day. These are
            totals only, with no IP addresses or details about visitors.
          </p>

          <h2>Waitlist</h2>
          <p>
            If you join the waitlist, PlayDate stores your name, email and, if you give it, what you would use
            PlayDate for. It is used only to tell you when PlayDate opens up. It is not sold or shared, and you can
            ask to be removed at any time.
          </p>

          <h2>Service providers</h2>
          <p>
            PlayDate runs on Vercel (hosting) and a Postgres database provider, and uses Google Calendar to check
            availability and send invitations. If an account holder&apos;s favorite show isn&apos;t in PlayDate&apos;s
            collection of page styles, just the show&apos;s name is sent to Anthropic&apos;s Claude to design a new
            style; nothing else about the person is sent. These providers process data only to run the service.
          </p>

          <h2>Keeping and deleting information</h2>
          <p>
            Booking records are kept so the owner can see past and upcoming meetings. You can cancel a booking any
            time with the link in your invitation. To ask for your booking information to be deleted, contact{" "}
            {contact ? <a href={`mailto:${contact}`}>{contact}</a> : name}.
          </p>
          <p>
            You can disconnect a Google account in PlayDate at any time, which deletes its stored tokens and calendar
            list. Access can also be revoked from{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
              your Google account permissions
            </a>
            .
          </p>

          <h2>Cookies</h2>
          <p>PlayDate uses one cookie to keep you signed in to your account. It does not use tracking or advertising cookies.</p>

          <h2>Contact</h2>
          <p>Questions about this policy: {contact ? <a href={`mailto:${contact}`}>{contact}</a> : name}.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
