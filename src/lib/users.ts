import { config } from "./config";
import { db } from "./db";
import { RESERVED_SLUGS } from "./eventTypes";

export interface User {
  id: number;
  email: string;
  handle: string | null;
  role: "admin" | "user";
  created_at: Date;
}

export const isOwnerEmail = (email: string) => config.ownerEmails.includes(email.toLowerCase());
/** The primary owner's links live at the site root (/intro); everyone else's at /handle/intro. */
export const isPrimaryOwner = (u: Pick<User, "email">) => config.ownerEmails[0] === u.email;

export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = await db();
  const [u] = await sql<User[]>`select * from users where email = ${email.toLowerCase()}`;
  return u ?? null;
}

export async function primaryOwnerId(): Promise<number | null> {
  const owner = config.ownerEmails[0];
  if (!owner) return null;
  const sql = await db();
  const [u] = await sql<{ id: number }[]>`select id from users where email = ${owner}`;
  return u?.id ?? null;
}

export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;

export function validHandle(h: string): boolean {
  return HANDLE_RE.test(h) && !RESERVED_SLUGS.has(h);
}

async function uniqueHandle(email: string): Promise<string> {
  const sql = await db();
  let base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
  if (base.length < 2 || !validHandle(base)) base = `user-${base}`.slice(0, 24).replace(/-+$/, "");
  for (let i = 0; i < 1000; i++) {
    const h = i === 0 ? base : `${base}-${i + 1}`;
    if (!validHandle(h)) continue;
    const [taken] = await sql`select 1 from users where handle = ${h}`;
    if (!taken) return h;
  }
  throw new Error("Could not pick a handle");
}

export async function signupLimit(): Promise<number> {
  const sql = await db();
  const [s] = await sql<{ signup_limit: number }[]>`select signup_limit from settings where id = 1`;
  return s?.signup_limit ?? 5;
}

/** Open sign-up spots: limit minus regular users (owners do not count). */
export async function spotsLeft(): Promise<number> {
  const sql = await db();
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from users where role = 'user'`;
  return Math.max(0, (await signupLimit()) - n);
}

export class SignupFullError extends Error {}

/**
 * Find or create the user for a Google sign-in.
 * - Owners (OWNER_EMAIL) are always admins.
 * - Existing users sign in.
 * - New people get an account only when `allowSignup` and a spot is open.
 */
export async function userForLogin(email: string, allowSignup: boolean): Promise<User | null> {
  email = email.toLowerCase();
  const sql = await db();
  if (isOwnerEmail(email)) {
    const handle = isPrimaryOwner({ email }) ? null : await uniqueHandle(email);
    const [u] = await sql<User[]>`
      insert into users (email, role, handle) values (${email}, 'admin', ${handle})
      on conflict (email) do update set role = 'admin'
      returning *`;
    await sql`insert into user_settings (user_id) values (${u.id}) on conflict do nothing`;
    return u;
  }
  const existing = await getUserByEmail(email);
  if (existing) return existing;
  if (!allowSignup) return null;

  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(7220013)`; // two people cannot take the last spot
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from users where role = 'user'`;
    const [s] = await tx<{ signup_limit: number }[]>`select signup_limit from settings where id = 1`;
    if (n >= (s?.signup_limit ?? 5)) throw new SignupFullError();
    const handle = await uniqueHandle(email);
    const [u] = await tx<User[]>`insert into users (email, role, handle) values (${email}, 'user', ${handle}) returning *`;
    await tx`insert into user_settings (user_id) values (${u.id})`;
    return u;
  });
}

/** Public path of a user's booking link. */
export async function linkPathFor(userId: number, slug: string): Promise<string> {
  const sql = await db();
  const [u] = await sql<{ handle: string | null; email: string }[]>`select handle, email from users where id = ${userId}`;
  return linkPath(u && !isPrimaryOwner(u) ? u.handle : null, slug);
}

/** Public path of a booking link. */
export function linkPath(handle: string | null, slug: string): string {
  return handle ? `/${handle}/${slug}` : `/${slug}`;
}
