-- Migration: 0003_move_in_payments
-- Purpose: Support landlord-configurable first + last month's rent at move-in.
--
--   profiles.require_last_month_rent — landlord toggle. When TRUE, new
--     tenants must pay 2× monthly_rent on move-in before they can pay
--     monthly rent. The second 1× is held by the landlord and auto-
--     credits the tenant's final lease month.
--
--   tenants.move_in_paid — TRUE once the 2× move-in payment has settled
--     (set by the Stripe webhook handler, not by clients).
--
--   tenants.last_month_held_amount — dollars the landlord is holding for
--     this tenant's last month. Set to monthly_rent at move-in confirmation;
--     decremented to 0 when auto-applied to the final lease month. Lets us
--     handle rent increases mid-lease without losing the original held value.
--
--   payments.category — 'monthly_rent' (default, all existing rows) |
--     'move_in' (the 2× upfront charge) | 'last_month_credit' (the synthetic
--     $0 paid row generated when held funds cover the final month). Used by
--     the dashboard and tenant portal to label rows correctly and by the
--     webhook to know which post-payment update to run.
--
-- Run in: Supabase Dashboard -> SQL Editor.
-- Idempotent: every ALTER uses IF NOT EXISTS.

begin;

alter table profiles
  add column if not exists require_last_month_rent boolean not null default false;

alter table tenants
  add column if not exists move_in_paid boolean not null default false;

alter table tenants
  add column if not exists last_month_held_amount numeric(10,2) not null default 0;

alter table payments
  add column if not exists category text not null default 'monthly_rent';

commit;

-- ----------------------------------------------------------------------
-- Verification (run after migration):
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where (table_name, column_name) in (
--     ('profiles','require_last_month_rent'),
--     ('tenants','move_in_paid'),
--     ('tenants','last_month_held_amount'),
--     ('payments','category')
--   );
-- Expect 4 rows.
-- ----------------------------------------------------------------------
