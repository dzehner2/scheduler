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
`;

/** Returns the SQL client, creating tables on first use. */
export async function db(): Promise<Sql> {
  const sql = client();
  if (!globalForDb.__schema) {
    globalForDb.__schema = sql.unsafe(SCHEMA).then(() => undefined);
    globalForDb.__schema.catch(() => {
      globalForDb.__schema = undefined;
    });
  }
  await globalForDb.__schema;
  return sql;
}
