import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "./config";
import { sign, verify } from "./crypto";

const COOKIE = "sched_session";
const TTL = 60 * 60 * 24 * 30; // 30 days

export async function startSession(email: string) {
  (await cookies()).set(COOKIE, sign({ email }, config.appSecret, TTL), {
    httpOnly: true,
    secure: config.appUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentOwner(): Promise<string | null> {
  const data = verify<{ email: string }>((await cookies()).get(COOKIE)?.value, config.appSecret);
  if (!data) return null;
  return config.ownerEmails.includes(data.email) ? data.email : null;
}

export async function requireOwner(): Promise<string> {
  const email = await currentOwner();
  if (!email) redirect("/login");
  return email;
}
