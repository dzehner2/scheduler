import postgres from "postgres";
import { config } from "./config";

type Sql = postgres.Sql;

const globalForDb = globalThis as unknown as { __sql?: Sql; __schema?: Promise<void> };

function client(): Sql {
  if (!globalForDb.__sql) {
    const url = config.databaseUrl;
    const local = /localhost|127\.0\.0\.1|\/tmp|host=\//.test(url);
    globalForDb.__sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      ssl: local ? false : "require",
      // Serverless poolers (Neon, Supabase) do not support prepared statements.
      prepare: false,
    });
  }
  return globalForDb.__sql;
}

const SCHEMA = /* sql */ `
create table if not exists accounts (
  id serial primary key,
  email text not null unique,
  refresh_token text not null,
  access_token text,
  access_expires_at timestamptz,
  status text not null default 'ok',
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists calendars (
  account_id int not null references accounts(id) on delete cascade,
  google_id text not null,
  summary text not null,
  color text,
  access_role text,
  check_conflicts boolean not null default false,
  primary key (account_id, google_id)
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  display_name text not null default '',
  time_zone text not null default 'America/Los_Angeles',
  booking_account_id int references accounts(id) on delete set null,
  booking_calendar_id text
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists event_types (
  id serial primary key,
  slug text not null unique,
  title text not null,
  description text not null default '',
  duration_min int not null default 30,
  buffer_before_min int not null default 0,
  buffer_after_min int not null default 0,
  min_notice_min int not null default 240,
  max_days_ahead int not null default 30,
  slot_interval_min int not null default 30,
  daily_cap int,
  weekly_hours jsonb not null,
  location_type text not null default 'meet',
  location_detail text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table event_types add column if not exists theme text not null default 'playdate';
alter table event_types add column if not exists brand_name text not null default '';
alter table event_types add column if not exists brand_primary text not null default '';
alter table event_types add column if not exists brand_dark text not null default '';
alter table event_types add column if not exists brand_bg text not null default '';
alter table event_types add column if not exists brand_logo_url text not null default '';
alter table event_types add column if not exists booking_account_id int references accounts(id) on delete set null;
alter table event_types add column if not exists booking_calendar_id text;

create table if not exists waitlist (
  id serial primary key,
  name text not null,
  email text not null unique,
  use_case text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key,
  event_type_id int references event_types(id) on delete set null,
  event_title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  block_start_at timestamptz not null,
  block_end_at timestamptz not null,
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null default '',
  notes text not null default '',
  status text not null default 'confirmed',
  account_id int references accounts(id) on delete set null,
  calendar_id text,
  google_event_id text,
  meet_link text,
  cancel_token text not null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists bookings_confirmed_time on bookings (block_start_at, block_end_at) where status = 'confirmed';

-- ---------- Multiple users ----------
create table if not exists users (
  id serial primary key,
  email text not null unique,
  handle text unique,
  role text not null default 'user',
  created_at timestamptz not null default now()
);
create table if not exists user_settings (
  user_id int primary key references users(id) on delete cascade,
  display_name text not null default '',
  time_zone text not null default 'America/Los_Angeles',
  booking_account_id int references accounts(id) on delete set null,
  booking_calendar_id text
);
alter table settings add column if not exists signup_limit int not null default 5;
alter table user_settings add column if not exists vibe text not null default 'mall';
alter table user_settings add column if not exists favorite_show text not null default '';

-- Private daily check-in for each user (kept 30 days)
create table if not exists user_checkins (
  user_id int not null references users(id) on delete cascade,
  day date not null,
  energy int,
  stress int,
  mood int,
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table accounts add column if not exists user_id int references users(id) on delete cascade;
alter table accounts drop constraint if exists accounts_email_key;
create unique index if not exists accounts_user_email on accounts (user_id, email);

alter table event_types add column if not exists user_id int references users(id) on delete cascade;
alter table event_types drop constraint if exists event_types_slug_key;
create unique index if not exists event_types_user_slug on event_types (user_id, slug);

alter table bookings add column if not exists user_id int references users(id) on delete cascade;
create index if not exists bookings_user_time on bookings (user_id, block_start_at) where status = 'confirmed';
`;

/**
 * Data created before PlayDate had multiple users belongs to the primary
 * owner (first OWNER_EMAIL). Idempotent: does nothing once claimed.
 */
async function claimSingleUserData(sql: Sql) {
  const owner = config.ownerEmails[0];
  if (!owner) return;
  const [u] = await sql<{ id: number }[]>`
    insert into users (email, role) values (${owner}, 'admin')
    on conflict (email) do update set role = 'admin'
    returning id`;
  await sql`update accounts set user_id = ${u.id} where user_id is null`;
  await sql`update event_types set user_id = ${u.id} where user_id is null`;
  await sql`update bookings b set user_id = coalesce(
      (select e.user_id from event_types e where e.id = b.event_type_id),
      (select a.user_id from accounts a where a.id = b.account_id), ${u.id})
    where b.user_id is null`;
  await sql`
    insert into user_settings (user_id, display_name, time_zone, booking_account_id, booking_calendar_id)
    select ${u.id}, display_name, time_zone, booking_account_id, booking_calendar_id from settings where id = 1
    on conflict (user_id) do nothing`;
}

/** Returns the SQL client, creating tables on first use. */
export async function db(): Promise<Sql> {
  const sql = client();
  if (!globalForDb.__schema) {
    globalForDb.__schema = sql
      .begin(async (tx) => {
        // One instance migrates at a time; others wait, then see it done.
        await tx`select pg_advisory_xact_lock(7220012)`;
        await tx.unsafe(SCHEMA);
        await claimSingleUserData(tx as unknown as Sql);
      })
      .then(() => undefined);
    globalForDb.__schema.catch(() => {
      globalForDb.__schema = undefined;
    });
  }
  await globalForDb.__schema;
  return sql;
}
