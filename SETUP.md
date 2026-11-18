# PlayDate setup

About 30 minutes, start to finish. You need a Google account, a GitHub account (you already have this repo), and a free Vercel account.

The app has three parts:

1. **A Google Cloud OAuth client.** This lets the app read your calendars and add bookings to them.
2. **A Postgres database.** This stores your settings, booking links and bookings. The free Neon plan through Vercel is enough.
3. **Hosting on Vercel.** This gives you the public booking link.

---

## 1. Google Cloud OAuth client

1. Go to https://console.cloud.google.com/ and sign in with your main Google account.
2. At the top, click the project picker, then **New project**. Name it `PlayDate` and click **Create**. Make sure it is selected.
3. Open **APIs and Services > Library**, search for **Google Calendar API**, and click **Enable**.
4. Open **APIs and Services > OAuth consent screen** (on newer consoles this is **Google Auth Platform > Branding**).
   - User type: **External** (choose Internal only if every account you will connect is in the same Google Workspace).
   - App name: `PlayDate`. Support email and developer contact: your email.
   - Save.
5. Under **Data access** (or **Scopes**), add these scopes:
   - `.../auth/calendar.readonly`
   - `.../auth/calendar.events`
   - `openid` and `.../auth/userinfo.email`
6. Under **Audience**, the app must end up **In production** (you will publish in step 3, once your privacy and terms pages are live).
   - Do not skip this. In "Testing" status, Google expires your sign-in every 7 days and the booking page will pause.
   - Google will not review it for a personal app. When you sign in you will see "Google hasn't verified this app". Click **Advanced**, then **Go to PlayDate (unsafe)**. This is expected for an app only you use.
7. Open **APIs and Services > Credentials > Create credentials > OAuth client ID**.
   - Application type: **Web application**. Name: `PlayDate`.
   - Authorized redirect URIs: add `http://localhost:3000/api/auth/callback` now. You will add the Vercel address in step 3.
   - Click **Create** and copy the **Client ID** and **Client secret**.

## 2. Deploy to Vercel with a database

1. Go to https://vercel.com/new, import the `dzehner2/scheduler` repository, name the project `playdate`, and click **Deploy**. The first deploy will show errors until the settings below are filled in. That is expected.
2. In the new project, open **Storage > Create Database > Neon (Postgres)**, accept the defaults, and connect it to the project. This sets `DATABASE_URL` for you.
3. Open **Settings > Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | from step 1.7 |
   | `GOOGLE_CLIENT_SECRET` | from step 1.7 |
   | `APP_SECRET` | a long random string, 32+ characters. A password manager's generator works. Do not change it later, or connected accounts must be reconnected. |
   | `OWNER_EMAIL` | the Google address you will sign in with. Several are allowed, separated by commas. |
   | `APP_URL` | your Vercel address, for example `https://playdate-dan.vercel.app` (no trailing slash) |
   | `CONTACT_EMAIL` | the email to show on the privacy policy and terms pages (Google requires a contact) |
   | `COFFEE_URL` | optional: your tip page, for example `https://ko-fi.com/yourname`. Shows a Buy me a coffee button on `/signup`. |

4. Open **Deployments**, click the three dots on the latest one, and choose **Redeploy**.

## 3. Finish Google setup and publish

Your app now has a public homepage, privacy policy and terms page. Google needs these before you can publish.

1. **Branding** page in Google Cloud: fill in
   - Application home page: `https://YOUR-VERCEL-ADDRESS`
   - Privacy policy link: `https://YOUR-VERCEL-ADDRESS/privacy`
   - Terms of service link: `https://YOUR-VERCEL-ADDRESS/terms`
   - Authorized domains: `YOUR-VERCEL-ADDRESS` (for example `playdate-dan.vercel.app`, no `https://`)
   - Save.
2. **Clients** page: edit the OAuth client and add a second redirect URI. It must match `APP_URL` exactly, plus `/api/auth/callback`:

   ```
   https://YOUR-VERCEL-ADDRESS/api/auth/callback
   ```
3. **Audience** page: click **Publish app**. If Google offers to start verification, you can skip it; an unverified app works for you, with the warning screen described in step 1.6.

Until the site is live you can leave the app in Testing and add each of your Google accounts under **Audience > Test users**. Sign-ins expire every 7 days in Testing, so publish once the pages are up.

## 4. First run

1. Open your Vercel address and click **Sign in with Google**. Choose the account in `OWNER_EMAIL` and tick every permission box.
2. Go to **Calendars and settings**:
   - Click **Connect a Google account** once for each of your other Google accounts.
   - Check every calendar that should block your time. Calendars you own start out checked. Holiday and shared calendars start out ignored.
   - Set your time zone and choose which calendar new bookings go on.
3. Go to **Booking links** and create one, for example `intro`. Share `https://YOUR-VERCEL-ADDRESS/intro`.

## How double-booking is prevented

- Before showing times, the app asks Google for busy time on **every checked calendar on every connected account**, plus the booking calendar.
- When a guest clicks Confirm, it checks again at that moment. Bookings are processed one at a time, so two people cannot grab the same slot.
- If any calendar cannot be read (for example, an account's access was revoked), the booking page shows no times instead of guessing. The dashboard shows a red banner telling you which account to reconnect.
- Events marked **Free** in Google Calendar, and all-day events marked Free, do not block time. Events marked **Busy** do.

## Running locally (optional)

```bash
cp .env.example .env.local   # then fill it in
npm install
npm run dev
```

You need a Postgres database, for example the Neon connection string from Vercel.

`npm test` runs the scheduling logic tests.
