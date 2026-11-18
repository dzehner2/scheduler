// A tiny stand-in for Google OAuth + Calendar, for local end-to-end testing only.
// Run: node scripts/fake-google.mjs   (listens on FAKE_GOOGLE_PORT, default 4455)
import http from "node:http";

const PORT = Number(process.env.FAKE_GOOGLE_PORT || 4455);
let nextEmail = "owner@example.com";
let failFreeBusyFor = null; // email whose free/busy should error
const calendars = {
  // email -> list of calendars
};
const events = {}; // calendarId -> [{id,start,end,summary,attendees}]
let seq = 1;
const anthropicCalls = [];

function calsFor(email) {
  if (!calendars[email]) {
    calendars[email] = [
      { id: email, summary: email, accessRole: "owner", primary: true, backgroundColor: "#4285f4" },
      { id: `family-${email}`, summary: "Family", accessRole: "owner", backgroundColor: "#0b8043" },
      { id: `holidays-${email}`, summary: "Holidays in United States", accessRole: "reader", backgroundColor: "#999" },
    ];
  }
  return calendars[email];
}

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
const read = (req) =>
  new Promise((r) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => r(d));
  });
const emailFromAuth = (req) => (req.headers.authorization || "").replace("Bearer at_", "");

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;

    if (p === "/__set") {
      if (url.searchParams.has("email")) nextEmail = url.searchParams.get("email");
      if (url.searchParams.has("failFreeBusy")) failFreeBusyFor = url.searchParams.get("failFreeBusy") || null;
      return json(res, 200, { nextEmail, failFreeBusyFor });
    }
    if (p === "/__seed" && req.method === "POST") {
      const { calendarId, start, end, summary } = JSON.parse(await read(req));
      (events[calendarId] ||= []).push({ id: `seed${seq++}`, start, end, summary });
      return json(res, 200, { ok: true });
    }
    if (p === "/__events") return json(res, 200, events);

    // Fake Anthropic Messages API (for the vibe designer). Returns a design with
    // deliberate flaws (show name in the copy, an em dash, unreadable ink) so tests
    // prove the app cleans them up.
    if (p === "/__anthropic") return json(res, 200, { calls: anthropicCalls });
    if (p === "/v1/messages" && req.method === "POST") {
      const body = JSON.parse(await read(req));
      anthropicCalls.push({ model: body.model, fallbacks: body.fallbacks, user: body.messages?.[0]?.content, hasFormat: !!body.output_config?.format });
      const design = {
        name: "Pinwheel Parade",
        blurb: "Candy stripes, a carnival of color and a bouncy marquee.",
        tagline: "Step right up \u2014 pick a time!",
        pick: "Pick a time",
        done: "Ta-da! You're booked.",
        font: "luckiest-guy",
        pattern: "stripes",
        radius: 12,
        colors: { pageBg: "#fff0d6", softBg: "#fff8ec", ink: "#cccccc", accent: "#e63946", accent2: "#2a9d8f", accent3: "#f4a261", link: "#e9c46a", led: "#f4a261", ledBg: "#f9f9f9", navBg: "#264653" },
      };
      return json(res, 200, {
        id: "msg_fake", type: "message", role: "assistant", model: body.model,
        content: [{ type: "text", text: JSON.stringify(design) }],
        stop_reason: "end_turn", stop_sequence: null,
        usage: { input_tokens: 900, output_tokens: 300 },
      });
    }

    if (p === "/auth") {
      const email = url.searchParams.get("login_hint") || nextEmail;
      const back = new URL(url.searchParams.get("redirect_uri"));
      back.searchParams.set("code", `code_${email}`);
      back.searchParams.set("state", url.searchParams.get("state"));
      res.writeHead(302, { Location: back.toString() });
      return res.end();
    }
    if (p === "/token") {
      const body = new URLSearchParams(await read(req));
      const email =
        body.get("grant_type") === "authorization_code"
          ? body.get("code").replace("code_", "")
          : body.get("refresh_token").replace("rt_", "");
      return json(res, 200, {
        access_token: `at_${email}`,
        refresh_token: body.get("grant_type") === "authorization_code" ? `rt_${email}` : undefined,
        expires_in: 3600,
        scope: "openid email https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
      });
    }
    if (p === "/userinfo") return json(res, 200, { email: emailFromAuth(req), email_verified: true });

    if (p === "/cal/users/me/calendarList") return json(res, 200, { items: calsFor(emailFromAuth(req)) });

    if (p === "/cal/freeBusy") {
      const email = emailFromAuth(req);
      const body = JSON.parse(await read(req));
      const min = Date.parse(body.timeMin);
      const max = Date.parse(body.timeMax);
      const out = {};
      for (const { id } of body.items) {
        if (failFreeBusyFor === email) {
          out[id] = { errors: [{ reason: "backendError" }] };
          continue;
        }
        out[id] = {
          busy: (events[id] || [])
            .filter((e) => Date.parse(e.end) > min && Date.parse(e.start) < max)
            .map((e) => ({ start: e.start, end: e.end })),
        };
      }
      return json(res, 200, { calendars: out });
    }

    const m = p.match(/^\/cal\/calendars\/([^/]+)\/events(?:\/([^/]+))?$/);
    if (m) {
      const calId = decodeURIComponent(m[1]);
      if (req.method === "POST") {
        const body = JSON.parse(await read(req));
        const ev = {
          id: `ev${seq++}`,
          start: body.start.dateTime,
          end: body.end.dateTime,
          summary: body.summary,
          attendees: body.attendees,
          description: body.description,
        };
        (events[calId] ||= []).push(ev);
        return json(res, 200, { id: ev.id, hangoutLink: body.conferenceData ? `https://meet.example/${ev.id}` : undefined });
      }
      if (req.method === "DELETE") {
        const id = decodeURIComponent(m[2]);
        const before = (events[calId] || []).length;
        events[calId] = (events[calId] || []).filter((e) => e.id !== id);
        if (events[calId].length === before) return json(res, 404, { error: { message: "Not found" } });
        res.writeHead(204);
        return res.end();
      }
    }
    json(res, 404, { error: { message: `fake-google: no route ${req.method} ${p}` } });
  })
  .listen(PORT, () => console.log(`fake google on ${PORT}`));
