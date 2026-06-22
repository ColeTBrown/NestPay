-- Migration: 0007_per_landlord_signwell
-- Purpose: Move SignWell credentials from process.env (single shared
--          account) to per-landlord storage. Each landlord connects
--          their own SignWell account; Rentidge stays as pure
--          infrastructure rather than the legal sender on every
--          signature request.
--
-- Design notes:
--   - Stored in plaintext on the profiles row. Same risk model as
--     stripe_account_id and any other API credential we already
--     hold — the protection is service_role-only access via
--     supabaseAdmin, plus RLS that prevents other users from reading
--     these columns. If we ever add tenant-readable views over
--     profiles, those views must NOT include these columns.
--   - api_app_id is also a secret-ish value (you don't want random
--     people sending requests through your app), so it lives with
--     the key. Both required to construct a working provider.
--   - connected_at: simple timestamp marker the dashboard reads to
--     decide whether to show "Connect SignWell" vs "Connected since X".
--     Distinct from "api_key is non-null" because we may add provider
--     options later (DocuSign, etc.) and connected_at lets the UI
--     answer "is any e-sign provider connected" cheaply.

begin;

alter table profiles
  add column if not exists signwell_api_key text,
  add column if not exists signwell_api_app_id text,
  add column if not exists signwell_connected_at timestamptz;

-- No RLS changes needed — profiles already has a tight policy that
-- only allows users to select/update their own row (and the service
-- role bypasses RLS for webhook/server-side reads).

commit;

-- ----------------------------------------------------------------------
-- Verification:
--   select column_name from information_schema.columns
--     where table_name = 'profiles'
--       and column_name in ('signwell_api_key','signwell_api_app_id','signwell_connected_at');
--   -- Expect 3 rows.
-- ----------------------------------------------------------------------
