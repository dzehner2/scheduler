import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { randomToken, sign } from "@/lib/crypto";
import { authUrl } from "@/lib/google";
import { currentOwner } from "@/lib/session";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") === "connect" ? "connect" : "login";
  if (mode === "connect" && !(await currentOwner())) {
    return NextResponse.redirect(`${config.appUrl}/login`);
  }
  const nonce = randomToken();
  const res = NextResponse.redirect(authUrl(nonce, req.nextUrl.searchParams.get("hint") ?? undefined));
  res.cookies.set("sched_oauth", sign({ nonce, mode }, config.appSecret, 600), {
    httpOnly: true,
    secure: config.appUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
