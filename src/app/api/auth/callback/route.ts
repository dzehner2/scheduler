import { NextResponse, type NextRequest } from "next/server";
import { config, GOOGLE_SCOPES } from "@/lib/config";
import { safeEqual, verify } from "@/lib/crypto";
import { exchangeCode, userEmail } from "@/lib/google";
import { saveAccount } from "@/lib/accounts";
import { currentOwner, startSession } from "@/lib/session";

function fail(message: string, to = "/login") {
  const url = new URL(to, config.appUrl);
  url.searchParams.set("error", message);
  const res = NextResponse.redirect(url);
  res.cookies.delete("sched_oauth");
  return res;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const state = verify<{ nonce: string; mode: "login" | "connect" }>(req.cookies.get("sched_oauth")?.value, config.appSecret);
  const back = state?.mode === "connect" ? "/dashboard/calendars" : "/login";

  if (q.get("error")) return fail(`Google sign-in was cancelled (${q.get("error")}).`, back);
  const code = q.get("code");
  if (!state || !code || !safeEqual(state.nonce, q.get("state") ?? "")) {
    return fail("Sign-in expired. Please try again.", back);
  }

  try {
    const tokens = await exchangeCode(code);
    const granted = new Set(tokens.scope.split(" "));
    const missing = GOOGLE_SCOPES.filter((s) => s.startsWith("https://") && !granted.has(s));
    if (missing.length) {
      return fail("Calendar access was not granted. Please try again and tick every calendar permission box.", back);
    }
    const email = await userEmail(tokens.access_token);

    if (state.mode === "login") {
      if (!config.ownerEmails.includes(email)) {
        return fail(`${email} is not allowed to manage this PlayDate.`);
      }
      await saveAccount(email, tokens);
      await startSession(email);
      const res = NextResponse.redirect(new URL("/dashboard", config.appUrl));
      res.cookies.delete("sched_oauth");
      return res;
    }

    if (!(await currentOwner())) return fail("Please sign in first.");
    await saveAccount(email, tokens);
    const res = NextResponse.redirect(new URL(`/dashboard/calendars?connected=${encodeURIComponent(email)}`, config.appUrl));
    res.cookies.delete("sched_oauth");
    return res;
  } catch (err) {
    console.error("OAuth callback failed", err);
    return fail(err instanceof Error ? err.message : "Google sign-in failed.", back);
  }
}
