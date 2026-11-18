import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { config } from "./config";
import { sign, verify } from "./crypto";
import { getUserByEmail, type User } from "./users";

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

export async function currentUser(): Promise<User | null> {
  const data = verify<{ email: string }>((await cookies()).get(COOKIE)?.value, config.appSecret);
  if (!data) return null;
  return getUserByEmail(data.email);
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") notFound();
  return u;
}
