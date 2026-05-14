-- Migration: 0002_oauth_states_and_sync_failures
-- Purpose:
--   1. oauth_states — server-side, single-use, user-bound, TTL'd nonces for
--      OAuth state CSRF protection (currently QuickBooks; future providers
--      can reuse with their own `provider` value).
--   2. sync_failures — durable record of QuickBooks (or other) sync errors
--      now that the Stripe webhook handler runs QB sync inline. Without this
--      table a failed sync would only land in console.error.
--
-- Run in: Supabase Dashboard -> SQL Editor.
-- Idempotent: every create uses IF NOT EXISTS.

begin;

------------------------------------------------------------------------
-- oauth_states — used by /api/quickbooks/auth (mint) and
-- /api/quickbooks/callback (validate + mark used).
------------------------------------------------------------------------
create table if not exists oauth_states (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nonce       text not null unique,
  provider    text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '10 minutes'),
  used_at     timestamptz
);

create index if not exists oauth_states_nonce_idx   on oauth_states(nonce);
create index if not exists oauth_states_expires_idx on oauth_states(expires_at);

alter table oauth_states enable row level security;
-- No policies = service role only. Clients never need to read/write this.

------------------------------------------------------------------------
-- sync_failures — written by the Stripe webhook handler when an inline
-- QuickBooks sync fails. Landlords can read their own; only the service
-- role writes / resolves.
------------------------------------------------------------------------
create table if not exists sync_failures (
  id                          uuid primary key default gen_random_uuid(),
  service                     text not null,
  payment_id                  uuid references payments(id) on delete set null,
  stripe_payment_intent_id    text,
  landlord_id                 uuid references auth.users(id) on delete set null,
  error_message               text,
  created_at                  timestamptz not null default now(),
  resolved_at                 timestamptz
);

create index if not exists sync_failures_service_idx  on sync_failures(service, resolved_at);
create index if not exists sync_failures_landlord_idx on sync_failures(landlord_id);

alter table sync_failures enable row level security;

drop policy if exists "sync_failures_landlord_select" on sync_failures;
create policy "sync_failures_landlord_select" on sync_failures
  for select using (landlord_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies = only the service role writes.

commit;

-- ----------------------------------------------------------------------
-- Optional cleanup (run as a pg_cron job daily if you want to keep the
-- oauth_states table from growing forever):
--
--   delete from oauth_states where expires_at < now() - interval '1 day';
--
-- Verification query (run after migration):
--   select tablename, rowsecurity
--   from pg_tables
--   where tablename in ('oauth_states','sync_failures');
--   -- Both rows should have rowsecurity = true.
-- ----------------------------------------------------------------------
