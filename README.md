# PlayDate

PlayDate ("come over for a play date!") is a personal booking page, like Calendly, that checks **all of your Google calendars across multiple Google accounts** before offering a time. You can't get double-booked because one calendar didn't know about another.

- Connect any number of Google accounts and choose which calendars count as busy.
- Booking links with length, buffers, minimum notice, how far ahead, start-time interval, daily cap and weekly hours.
- Guests see times in their own time zone. Bookings land on the calendar you choose, with a Google Meet link. Google sends the invite.
- Guests can cancel or reschedule from a private link. You can cancel from the dashboard.
- Fails closed: if any calendar can't be read, no times are offered.

Setup: see [SETUP.md](SETUP.md).

## Tech

Next.js 16 (App Router) and TypeScript, Postgres via `postgres`, Luxon for time zones, Vitest. Google Calendar is called directly over REST (free/busy, calendar list, events). Tokens are encrypted at rest with AES-256-GCM.

```
src/lib/slots.ts      availability math (pure, unit tested)
src/lib/accounts.ts   Google accounts, token refresh, busy time across calendars
src/lib/booking.ts    create and cancel bookings (serialized with a Postgres advisory lock)
src/app/[slug]        public booking page
src/app/dashboard     owner dashboard
scripts/fake-google.mjs  stand-in Google server for local end-to-end testing
```
