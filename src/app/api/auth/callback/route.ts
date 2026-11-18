import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_SCOPES, config } from "@/lib/config";
import { safeEqual, verify } from "@/lib/crypto";
import { exchangeCode, userEmail } from "@/lib/google";
import { saveAccount } from "@/lib/accounts";
import { getSettings } from "@/lib/eventTypes";
import { currentUser, startSession } from "@/lib/session";
import { SignupFullError, userForLogin } from "@/lib/users";

function fail(message: string, to = "/login") {
  const url = new URL(to, config.appUrl);
  url.searchParams.set("error", message);
  const res = NextResponse.redirect(url);
  res.cookies.delete("sched_oauth");
  return res;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const state = verify<{ nonce: string; mode: "login" | "connect" | "signup" }>(req.cookies.get("sched_oauth")?.value, config.appSecret);
  const back = state?.mode === "connect" ? "/dashboard/calendars" : state?.mode === "signup" ? "/signup" : "/login";

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

    if (state.mode === "login" || state.mode === "signup") {
      let user;
      try {
        user = await userForLogin(email, state.mode === "signup");
      } catch (err) {
        if (err instanceof SignupFullError) {
          return fail("Those spots just filled up. Join the waitlist below and you will hear when one opens.", "/signup");
        }
        throw err;
      }
      if (!user) {
        return fail(`There is no PlayDate account for ${email}. Sign up first, or sign in with the account you signed up with.`);
      }
      await saveAccount(user.id, email, tokens);
      await startSession(email);
      const answered = !!(await getSettings(user.id)).favorite_show;
      const res = NextResponse.redirect(new URL(answered ? "/dashboard" : "/dashboard/welcome", config.appUrl));
      res.cookies.delete("sched_oauth");
      return res;
    }

    const user = await currentUser();
    if (!user) return fail("Please sign in first.");
    await saveAccount(user.id, email, tokens);
    const res = NextResponse.redirect(new URL(`/dashboard/calendars?connected=${encodeURIComponent(email)}`, config.appUrl));
    res.cookies.delete("sched_oauth");
    return res;
  } catch (err) {
    console.error("OAuth callback failed", err);
    return fail(err instanceof Error ? err.message : "Google sign-in failed.", back);
  }
}
