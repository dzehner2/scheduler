// End-to-end test against a running app + scripts/fake-google.mjs and an EMPTY database.
// Needs Playwright with Chromium installed. Run: node scripts/e2e.js
const { chromium } = require("playwright");
const { DateTime } = require("luxon");

const APP = "http://localhost:3000";
const FAKE = "http://localhost:4455";
const OUT = process.env.E2E_OUT || require("node:os").tmpdir();
const TZ = "America/Los_Angeles";
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};
const set = (q) => fetch(`${FAKE}/__set?${q}`);

(async () => {
  const browser = await chromium.launch();
  const owner = await browser.newPage({ viewport: { width: 1200, height: 900 } });

  // 1. Owner signs in
  await set("email=dan@work.test");
  await owner.goto(`${APP}/login`);
  await owner.click("text=Sign in with Google");
  await owner.waitForURL(`${APP}/dashboard`);
  check(owner.url().endsWith("/dashboard"), "owner signs in with Google and lands on dashboard");

  // Wrong account is refused
  const intruder = await browser.newPage();
  await set("email=someone@else.test");
  await intruder.goto(`${APP}/api/auth/google?mode=login`);
  check((await intruder.textContent("body")).includes("not allowed"), "non-owner Google account is refused");

  // 2. Calendars page; connect a second account
  await owner.goto(`${APP}/dashboard/calendars`);
  const page1 = await owner.textContent("body");
  check(page1.includes("dan@work.test") && page1.includes("Family"), "first account calendars listed");
  await set("email=dan@personal.test");
  await owner.click("text=Connect a Google account");
  await owner.waitForURL(/connected=/);
  const page2 = await owner.textContent("body");
  check(page2.includes("Connected dan@personal.test"), "second Google account connected");
  const ignored = await owner.locator("tr", { hasText: "Holidays" }).first().textContent();
  check(ignored.includes("Ignored"), "subscribed holiday calendar starts ignored");

  await owner.fill("#display_name", "Dan");
  await owner.selectOption("#time_zone", TZ);
  await owner.click("text=Save settings");
  await owner.waitForURL(/saved=1/);
  await owner.screenshot({ path: `${OUT}/shot-calendars.png`, fullPage: true });

  // 3. Create a booking link
  await owner.goto(`${APP}/dashboard/event-types/new`);
  await owner.fill("#title", "Intro call");
  await owner.fill("#slug", "intro");
  await owner.fill("#description", "A quick call to see if we are a fit.");
  await owner.fill("#daily_cap", "3");
  await owner.click("button:has-text('Save')");
  await owner.waitForURL(/event-types\?saved=1/);
  check((await owner.textContent("body")).includes("/intro"), "booking link created");

  // 3b. A second link with CedarStone branding
  await owner.goto(`${APP}/dashboard/event-types/new`);
  await owner.fill("#title", "Site walk");
  await owner.fill("#slug", "cedarstone");
  await owner.fill("#description", "Walk the site and talk through options.");
  await owner.selectOption("#theme", "brand");
  await owner.click("button:has-text('CedarStone')");
  check((await owner.inputValue("#brand_primary")) === "#117A4F", "CedarStone preset fills brand colors");
  await owner.click("button:has-text('Save')");
  await owner.waitForURL(/event-types\?saved=1/);
  const cs = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  await cs.goto(`${APP}/cedarstone`);
  await cs.waitForSelector(".day");
  const csText = await cs.textContent("body");
  check(csText.includes("CedarStone Design & Build"), "branded page shows company name");
  check(!/landline|busy signal|rewind|PlayDate/i.test(csText), "branded page has no PlayDate 80s wording");
  check(!csText.includes("\u2014"), "branded page has no em dashes");
  const bg = await cs.evaluate(() => getComputedStyle(document.querySelector(".theme-brand")).backgroundColor);
  check(bg === "rgb(242, 246, 242)", `branded page background is CedarStone light (${bg})`);
  check(/CedarStone/.test(await cs.title()), "branded page title includes company");
  await cs.waitForSelector(".time", { timeout: 15000 }).catch(() => {});
  await cs.screenshot({ path: `${OUT}/shot-cedarstone.png` });
  const pd = await browser.newPage();
  await pd.goto(`${APP}/intro`);
  check((await pd.textContent("body")).includes("landline"), "other links keep the PlayDate look");

  // 4. Seed conflicts on two different accounts, a week out (Monday)
  let mon = DateTime.now().setZone(TZ).startOf("day").plus({ days: 3 });
  while (mon.weekday !== 1) mon = mon.plus({ days: 1 });
  const t = (hm) => mon.set({ hour: +hm.split(":")[0], minute: +hm.split(":")[1] });
  const seed = (calendarId, s, e, summary) =>
    fetch(`${FAKE}/__seed`, {
      method: "POST",
      body: JSON.stringify({ calendarId, start: t(s).toISO(), end: t(e).toISO(), summary }),
    });
  await seed("dan@work.test", "10:00", "11:00", "Work meeting");
  await seed("family-dan@personal.test", "13:00", "14:00", "Dentist");
  await seed("holidays-dan@work.test", "00:00", "23:59", "Ignored holiday");

  const slotsFor = async () => {
    const r = await fetch(
      `${APP}/api/slots?type=intro&start=${encodeURIComponent(mon.toUTC().toISO())}&end=${encodeURIComponent(mon.plus({ days: 1 }).toUTC().toISO())}`,
    );
    return { status: r.status, body: await r.json() };
  };
  const local = (iso) => DateTime.fromISO(iso, { zone: TZ }).toFormat("HH:mm");
  const { body } = await slotsFor();
  const times = body.slots.map(local);
  console.log("      Monday slots:", times.join(" "));
  check(times.includes("09:00"), "9:00 open");
  check(!times.includes("09:30"), "9:30 blocked (10 min buffer runs into 10:00 work meeting)");
  check(!times.includes("10:00") && !times.includes("10:30"), "work calendar meeting blocks 10:00-11:00");
  check(times.includes("11:00"), "11:00 open");
  check(!times.includes("12:30") && !times.includes("13:00") && !times.includes("13:30"), "personal Family calendar blocks around 13:00-14:00");
  check(times.includes("14:00"), "14:00 open");
  check(times.length > 0, "ignored holiday calendar does not block the day");

  // 5. Guest books in their own time zone (New York)
  const guestCtx = await browser.newContext({ timezoneId: "America/New_York", viewport: { width: 1100, height: 800 } });
  const guest = await guestCtx.newPage();
  await guest.goto(`${APP}/intro`);
  await guest.waitForSelector(".day.has");
  // Navigate to the seeded Monday's week if needed
  for (let i = 0; i < 4; i++) {
    const btn = guest.locator(`.day.has:has-text("${mon.toFormat("d")}"):has-text("${mon.toFormat("LLL")}")`);
    if (await btn.count()) {
      await btn.first().click();
      break;
    }
    await guest.click("text=Next");
    await guest.waitForTimeout(600);
  }
  await guest.screenshot({ path: `${OUT}/shot-booking.png` });
  const firstTime = await guest.locator(".time").first().textContent();
  check(firstTime.trim() === "12:00 PM", `guest in New York sees 9:00 Pacific as ${firstTime.trim()}`);
  await guest.locator(".time").first().click();
  await guest.fill("#name", "Riley Retailer");
  await guest.fill("#email", "riley@shop.test");
  await guest.fill("#notes", "Interested in stocking your line.");
  await guest.click("text=Lock it in");
  await guest.waitForSelector("text=It's a play date!");
  await guest.screenshot({ path: `${OUT}/shot-confirmed.png` });
  check(true, "guest booking confirmed");

  const evs = await (await fetch(`${FAKE}/__events`)).json();
  const created = (evs["dan@work.test"] || []).find((e) => e.summary === "Intro call with Riley Retailer");
  check(!!created, "event created on booking calendar");
  check(created && created.attendees[0].email === "riley@shop.test", "guest added as attendee (Google sends the invite)");
  check(created && created.description.includes("/booking/"), "event description has cancel/reschedule link");
  const after = (await slotsFor()).body.slots.map(local);
  check(!after.includes("09:00"), "booked 9:00 slot no longer offered");

  // 6. Two guests race for the same slot
  const raceSlot = (await slotsFor()).body.slots.find((s) => local(s) === "15:00");
  const book = (name) =>
    fetch(`${APP}/api/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "intro", start: raceSlot, name, email: `${name}@x.test` }),
    }).then((r) => r.status);
  const statuses = (await Promise.all([book("a"), book("b"), book("c")])).sort();
  check(JSON.stringify(statuses) === "[200,409,409]", `three simultaneous bookings for one slot -> ${statuses.join(",")}`);

  // 7. Daily cap (3): 9:00 and 15:00 booked, one more allowed then day closes
  const capSlot = (await slotsFor()).body.slots[0];
  const capStatus = await fetch(`${APP}/api/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "intro", start: capSlot, name: "d", email: "d@x.test" }),
  }).then((r) => r.status);
  check(capStatus === 200, "third booking of the day accepted");
  check((await slotsFor()).body.slots.length === 0, "daily cap of 3 closes the day");

  // 8. Fail closed when one account cannot be read
  await set("failFreeBusy=dan@personal.test");
  const broken = await fetch(
    `${APP}/api/slots?type=intro&start=${encodeURIComponent(mon.plus({ days: 1 }).toUTC().toISO())}&end=${encodeURIComponent(mon.plus({ days: 2 }).toUTC().toISO())}`,
  );
  check(broken.status === 503, `if any calendar cannot be checked, no times are offered (HTTP ${broken.status})`);
  await set("failFreeBusy=");

  // 9. Guest cancels via the manage link
  await guest.click("text=Cancel or reschedule");
  await guest.click("text=Cancel meeting");
  await guest.waitForSelector("text=This play date is cancelled.");
  const evs2 = await (await fetch(`${FAKE}/__events`)).json();
  check(!(evs2["dan@work.test"] || []).some((e) => e.summary === "Intro call with Riley Retailer"), "cancel deletes the Google event");
  check((await slotsFor()).body.slots.map(local).includes("09:00"), "cancelled time is offered again");

  // 10. Bad cancel token is rejected
  const bad = await fetch(`${APP}/api/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: created ? "00000000-0000-0000-0000-000000000000" : "", token: "nope" }) });
  check(bad.status === 404, "cancel with wrong token rejected");

  await owner.goto(`${APP}/dashboard`);
  await owner.screenshot({ path: `${OUT}/shot-dashboard.png`, fullPage: true });
  check((await owner.textContent("body")).includes("Riley Retailer"), "dashboard lists bookings");

  // Phone width check
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`${APP}/intro`);
  await phone.waitForSelector(".day");
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, "booking page fits a phone screen");
  await phone.screenshot({ path: `${OUT}/shot-phone.png` });

  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
