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
  await owner.waitForURL(/\/dashboard\/welcome/);
  check(true, "owner signs in with Google and is asked their favorite show first");

  // Wrong account is refused
  const intruder = await browser.newPage();
  await set("email=someone@else.test");
  await intruder.goto(`${APP}/api/auth/google?mode=login`);
  check((await intruder.textContent("body")).includes("no PlayDate account"), "Google account without a PlayDate account is refused");

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
  await owner.selectOption("#booking_calendar", { label: "Family (dan@personal.test)" });
  await owner.check("input[name=extra_calendar][value='1|dan@work.test']");
  await owner.uncheck("input[name=ask_feeling]");
  await owner.click("button:has-text('Save')");
  await owner.waitForURL(/event-types\?saved=1/);
  const cs = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  await cs.goto(`${APP}/cedarstone`);
  await cs.waitForSelector(".day");
  const csText = await cs.textContent("body");
  check(csText.includes("CedarStone Design & Build"), "branded page shows company name");
  check(!/landline|busy signal|rewind|PlayDate/i.test(csText), "branded page has no PlayDate 80s wording");
  check((await cs.locator(".feel").count()) === 0, "feeling question is off for a link where it was turned off");
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
  // Guest feeling question: tip appears, and the answer is never sent anywhere
  const sentBodies = [];
  guest.on("request", (r) => { if (r.method() === "POST") sentBodies.push(r.postData() || ""); });
  check((await guest.locator(".feel").count()) === 1, "feeling question shows on links where it is on");
  await guest.click(".feel-chip:has-text('Stressed')");
  check((await guest.textContent(".feel-tip")).includes("slow breathing"), "guest picks a feeling and gets a science-backed tip");
  check((await guest.textContent(".feel-tip")).includes("Zaccaro"), "tip cites its source");
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
  check(sentBodies.length > 0 && !sentBodies.some((b) => /stressed|feel/i.test(b)), "guest's feeling is never sent to the server");

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

  // 10b. Per-link booking calendar: CedarStone bookings go on the second account
  const tue = mon.plus({ days: 1 });
  const tueSlots = async (type) => {
    const r = await fetch(`${APP}/api/slots?type=${type}&start=${encodeURIComponent(tue.toUTC().toISO())}&end=${encodeURIComponent(tue.plus({ days: 1 }).toUTC().toISO())}`);
    return (await r.json()).slots;
  };
  const csSlot = (await tueSlots("cedarstone"))[0];
  const csBook = await fetch(`${APP}/api/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "cedarstone", start: csSlot, name: "Casey Client", email: "casey@co.test" }),
  });
  check(csBook.status === 200, "CedarStone link booking accepted");
  const evs3 = await (await fetch(`${FAKE}/__events`)).json();
  check((evs3["family-dan@personal.test"] || []).some((e) => e.summary === "Site walk with Casey Client"), "CedarStone booking lands on the link's own calendar");
  const mainEv = (evs3["family-dan@personal.test"] || []).find((e) => e.summary === "Site walk with Casey Client");
  const copyEv = (evs3["dan@work.test"] || []).find((e) => e.summary === "Site walk with Casey Client");
  check(mainEv && mainEv.attendees.length === 1, "main calendar sends the guest's invite");
  check(copyEv && copyEv.attendees.length === 0, "a silent copy lands on the extra calendar (no second invite)");
  check(copyEv && copyEv.description.includes("Casey Client"), "copy includes the booking details");
  check(!(await tueSlots("intro")).includes(csSlot), "a CedarStone booking blocks that time on other links");
  await owner.goto(`${APP}/dashboard/event-types`);
  check((await owner.textContent("body")).includes("Bookings go on Family (dan@personal.test)"), "link list shows each link's booking calendar");
  check((await owner.textContent("body")).includes("Copies on dan@work.test (dan@work.test)"), "link list shows extra calendars");
  // Cancelling removes the booking and every copy
  const csInfo = await csBook.json();
  const csCancel = await fetch(`${APP}/api/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: csInfo.id, token: csInfo.token }) });
  const evs5 = await (await fetch(`${FAKE}/__events`)).json();
  check(csCancel.status === 200 && !Object.values(evs5).some((list) => list.some((e) => e.summary === "Site walk with Casey Client")), "cancelling removes the booking from every calendar");
  // Book it again so later checks have a CedarStone booking
  const csSlot2 = (await tueSlots("cedarstone"))[0];
  await fetch(`${APP}/api/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "cedarstone", start: csSlot2, name: "Casey Client", email: "casey@co.test" }) });
  await owner.goto(`${APP}/dashboard/calendars`);
  owner.once("dialog", (d) => d.accept());
  await owner.locator(".card", { hasText: "dan@personal.test" }).first().locator("button:has-text('Disconnect')").click();
  await owner.waitForURL(/error=/);
  check((await owner.textContent("body")).includes("Site walk"), "cannot disconnect an account a link books onto");

  // 10c. Owner answers the favorite-show question; the whole site takes on the vibe
  await owner.goto(`${APP}/dashboard/welcome`);
  await owner.fill("#favorite_show", "DarkWing Duck");
  await owner.click("text=Show me my vibe");
  await owner.waitForURL(/step=vibe/);
  check((await owner.textContent("body")).includes("Night Patrol"), "owner's favorite show maps to the Night Patrol vibe");
  await owner.click("text=Looks good, keep going");
  await owner.waitForURL(/calendars/);
  // Private daily check-in appears once the favorite show is answered
  await owner.goto(`${APP}/dashboard`);
  check((await owner.locator(".checkin").count()) === 1, "owner is asked the daily check-in");
  await owner.click(".checkin fieldset:has(legend:text('Energy')) .scale-dot:has-text('2')");
  await owner.click(".checkin fieldset:has(legend:text('Stress')) .scale-dot:has-text('5')");
  await owner.click(".checkin fieldset:has(legend:text('Mood')) .scale-dot:has-text('3')");
  await owner.click(".checkin button:has-text('Check in')");
  await owner.waitForURL(/checkin=1/);
  check((await owner.textContent("body")).includes("10 minute gap"), "check-in gives the owner a private tip");
  check((await owner.locator(".checkin").count()) === 0, "check-in is not asked again the same day");
  await owner.screenshot({ path: `${OUT}/shot-checkin-tip.png` });
  await owner.goto(`${APP}/dashboard/footprint`);
  const fp = await owner.textContent("body");
  check(/Wh|kWh/.test(fp) && fp.includes("Suggested donation") && fp.includes("One Tree Planted"), "owner sees their footprint and a suggested donation");
  check((await owner.getAttribute("a:has-text('Donate to One Tree Planted')", "href")) === "https://onetreeplanted.org/", "donate button goes straight to One Tree Planted");
  await owner.screenshot({ path: `${OUT}/shot-footprint.png`, fullPage: true });
  const pubFp = await browser.newPage();
  const pubRes = await pubFp.goto(`${APP}/footprint`);
  check(pubRes.status() === 200 && (await pubFp.textContent("body")).includes("Our footprint"), "public footprint page shows app totals");
  check(!/dan@|riley|casey/i.test(await pubFp.textContent("body")), "public footprint page shows no personal details");

  const homeVibe = await browser.newPage();
  await homeVibe.goto(`${APP}/`);
  check((await homeVibe.getAttribute("body", "class")) === "vibe-night-patrol", "homepage uses the owner's vibe");
  check((await homeVibe.locator(".quote-line").count()) === 1, "homepage shows a rotating 80s quote");
  const q1 = await homeVibe.textContent(".quote-line");
  await homeVibe.click("text=Another one");
  check((await homeVibe.textContent(".quote-line")) !== q1, "quote changes on demand");
  await homeVibe.screenshot({ path: `${OUT}/shot-home-night.png` });
  const introVibe = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  await introVibe.goto(`${APP}/intro`);
  await introVibe.waitForSelector(".day");
  check(await introVibe.locator(".vibe-page.vibe-night-patrol").count() === 1, "owner's booking page uses Night Patrol");
  check(!/darkwing|duck/i.test(await introVibe.textContent("body")), "guest page never names the show");
  await introVibe.waitForSelector(".time", { timeout: 15000 }).catch(() => {});
  await introVibe.screenshot({ path: `${OUT}/shot-intro-night.png` });
  const csStill = await browser.newPage();
  await csStill.goto(`${APP}/cedarstone`);
  check(await csStill.locator(".theme-brand").count() === 1 && !/Signal|moment/i.test(await csStill.textContent("body")), "CedarStone link keeps its company branding");

  // 10d. A second person signs up (early spot) and gets a fully separate PlayDate
  await set("email=jordan@x.test");
  const jctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const jp = await jctx.newPage();
  await jp.goto(`${APP}/signup`);
  check((await jp.textContent("body")).includes("of 5 early spots left"), "sign-up page shows open early spots");
  check((await jp.locator("text=Buy me a coffee").count()) === 0, "no coffee button for early sign-ups");
  await jp.click("text=Sign up with Google");
  await jp.waitForURL(/dashboard\/welcome/);
  check(true, "new user lands on the favorite-show question");
  await jp.fill("#favorite_show", "Knight Rider");
  await jp.click("text=Show me my vibe");
  await jp.waitForURL(/step=vibe/);
  check((await jp.textContent("body")).includes("Night Drive"), "new user's show maps to a vibe (Night Drive)");
  await jp.click("text=Looks good, keep going");
  await jp.waitForURL(/welcome=1/);
  await jp.screenshot({ path: `${OUT}/shot-new-user-dashboard.png`, fullPage: true });
  const jcal = await jp.textContent("body");
  check(jcal.includes("jordan@x.test") && !jcal.includes("dan@work.test") && !jcal.includes("dan@personal.test"), "new user sees only their own Google accounts");
  await jp.goto(`${APP}/dashboard/event-types/new`);
  await jp.fill("#title", "Hangout");
  await jp.fill("#slug", "intro");
  await jp.click("button:has-text('Save')");
  await jp.waitForURL(/event-types\?saved=1/);
  const jlinks = await jp.innerText("main"); // visible text only
  check(jlinks.includes("/jordan/intro"), "new user's link lives at /jordan/intro (same name as owner's is fine)");
  check(!jlinks.includes("Site walk") && !jlinks.includes("Intro call"), "new user does not see the owner's links");
  await jp.goto(`${APP}/dashboard`);
  check(!(await jp.textContent("body")).includes("Riley") && !(await jp.textContent("body")).includes("Casey"), "new user does not see the owner's bookings");
  check(!(await jp.textContent("body")).includes("10 minute gap") && (await jp.locator(".checkin").count()) === 1, "new user gets their own check-in, never the owner's");
  for (const path of ["/dashboard/event-types/1", "/dashboard/users", "/dashboard/waitlist"]) {
    await jp.goto(`${APP}${path}`);
    check((await jp.textContent("body")).includes("Wrong number"), `new user is blocked from ${path}`);
  }
  check((await jp.evaluate(() => fetch("/api/waitlist/export").then((r) => r.status))) === 404, "new user cannot export the waitlist");
  // Raw HTML (including hidden page data) must never contain the owner's details
  const ownerData = ["Site walk", "Riley Retailer", "riley@shop.test", "Casey Client", "casey@co.test", "dan@work.test", "dan@personal.test", "Interested in stocking"];
  for (const path of ["/dashboard", "/dashboard/event-types", "/dashboard/calendars", "/dashboard/event-types/new", "/dashboard/welcome"]) {
    const html = await (await jp.request.get(`${APP}${path}`)).text();
    const hits = ownerData.filter((w) => html.includes(w));
    check(hits.length === 0, `no owner data in new user's raw ${path}${hits.length ? ` (found ${hits.join(", ")})` : ""}`);
  }
  // Availability is per person: Jordan's busy time does not block Dan, and vice versa
  await fetch(`${FAKE}/__seed`, { method: "POST", body: JSON.stringify({ calendarId: "jordan@x.test", start: tue.set({ hour: 11 }).toISO(), end: tue.set({ hour: 12 }).toISO(), summary: "Jordan busy" }) });
  const slotsU = async (u, type) => {
    const r = await fetch(`${APP}/api/slots?${u ? `u=${u}&` : ""}type=${type}&start=${encodeURIComponent(tue.toUTC().toISO())}&end=${encodeURIComponent(tue.plus({ days: 1 }).toUTC().toISO())}`);
    return (await r.json()).slots.map(local);
  };
  const danTue = await slotsU(null, "intro");
  const jorTue = await slotsU("jordan", "intro");
  check(danTue.includes("11:00") && !jorTue.includes("11:00"), "one user's busy calendar never blocks another user's page");
  check(jorTue.includes("09:00"), "owner's bookings do not block the new user's page");
  const jb = await fetch(`${APP}/api/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ u: "jordan", type: "intro", start: (await (await fetch(`${APP}/api/slots?u=jordan&type=intro&start=${encodeURIComponent(tue.toUTC().toISO())}&end=${encodeURIComponent(tue.plus({ days: 1 }).toUTC().toISO())}`)).json()).slots[0], name: "Sam Guest", email: "sam@g.test" }),
  });
  check(jb.status === 200, "guest can book the new user's link");
  const evs4 = await (await fetch(`${FAKE}/__events`)).json();
  check((evs4["jordan@x.test"] || []).some((e) => e.summary === "Hangout with Sam Guest"), "booking lands on the new user's own calendar");
  check(!Object.entries(evs4).some(([cal, list]) => !cal.includes("jordan") && list.some((e) => e.summary === "Hangout with Sam Guest")), "and on nobody else's calendar");
  await owner.goto(`${APP}/dashboard`);
  check(!(await owner.textContent("body")).includes("Sam Guest"), "owner does not see the new user's bookings");
  await owner.goto(`${APP}/dashboard/users`);
  const usersPage = await owner.textContent("body");
  check(usersPage.includes("jordan@x.test") && usersPage.includes("1 of 5 sign-up spots used"), "owner's Users page lists the new user");
  const jpage = await browser.newPage();
  await jpage.goto(`${APP}/jordan/intro`);
  await jpage.waitForSelector(".day");
  check(await jpage.locator(".vibe-page.vibe-neon-drive").count() === 1, "new user's public page uses their own vibe");
  await jpage.waitForSelector(".time", { timeout: 15000 }).catch(() => {});
  await jpage.screenshot({ path: `${OUT}/shot-jordan-page.png` });

  // 10e. When spots run out, sign-up turns into the waitlist (and direct attempts are refused)
  await owner.fill("input[name=signup_limit]", "1");
  await owner.click("form:has(input[name=signup_limit]) button");
  await owner.waitForURL(/users\?saved=1/);
  await set("email=late@x.test");
  const late = await browser.newContext();
  const lp = await late.newPage();
  await lp.goto(`${APP}/api/auth/google?mode=signup`);
  await lp.waitForURL(/signup\?error=/);
  check((await lp.textContent("body")).includes("spots just filled up"), "direct sign-up is refused when spots are full");
  check((await lp.locator("#wl-name").count()) === 1, "full sign-up page shows the waitlist form");
  await lp.goto(`${APP}/api/auth/google?mode=login`);
  check((await lp.textContent("body")).includes("no PlayDate account"), "unknown Google account cannot sign in");

  // 11. Waitlist sign-up
  const visitor = await browser.newPage();
  await visitor.goto(`${APP}/signup`);
  check((await visitor.locator("text=Buy me a coffee").count()) === 0, "coffee button hidden before joining the waitlist");
  await visitor.fill("#wl-name", "Pat Painter");
  await visitor.fill("#wl-email", "pat@paint.test");
  await visitor.fill("#wl-use", "=HYPERLINK(1) club nights");
  await visitor.click("text=Put me on the list");
  await visitor.waitForSelector("text=on the list!");
  const again = await fetch(`${APP}/api/waitlist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Pat", email: "PAT@paint.test" }) });
  check(again.status === 200, "signing up twice is accepted quietly");
  const coffeeShown = (await visitor.locator("text=Buy me a coffee").count()) > 0;
  check(coffeeShown === !!process.env.COFFEE_URL, `coffee button ${coffeeShown ? "shown" : "hidden"} after joining (COFFEE_URL ${process.env.COFFEE_URL ? "set" : "unset"})`);
  await visitor.screenshot({ path: `${OUT}/shot-signup.png`, fullPage: true });
  await owner.goto(`${APP}/dashboard/waitlist`);
  const wl = await owner.textContent("body");
  check(wl.includes("pat@paint.test") && wl.includes("1 person"), "waitlist shows one entry in the dashboard");
  const csv = await owner.evaluate(() => fetch("/api/waitlist/export").then((r) => r.text()));
  check(csv.includes("'=HYPERLINK"), "CSV export neutralizes spreadsheet formulas");
  const anonCsv = await fetch(`${APP}/api/waitlist/export`);
  check(anonCsv.status === 404, "CSV export requires sign-in");

  // 12. Owner removes the new user; their pages stop working
  await owner.goto(`${APP}/dashboard/users`);
  owner.once("dialog", (d) => d.accept());
  await owner.locator("tr", { hasText: "jordan@x.test" }).locator("button:has-text('Remove')").click();
  await owner.waitForTimeout(800);
  const gone = await fetch(`${APP}/jordan/intro`);
  check(gone.status === 404, "removed user's booking page is gone");
  await jp.goto(`${APP}/dashboard`);
  check(jp.url().includes("/login"), "removed user is signed out");

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
