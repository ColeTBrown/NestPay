-- Migration: 0004_security_deposits
-- Purpose: Support per-unit security deposits as part of move-in collection.
--
--   units.security_deposit_amount — dollars. 0 = no deposit required for
--     this unit. Set by landlord when creating/editing the unit. New
--     tenants inherit the unit's deposit amount at move-in.
--
--   profiles.deposit_collection_mode — 'bundled' | 'separate'. Controls
--     whether the deposit is added to the move-in PaymentIntent (one
--     transaction) or charged as its own PaymentIntent (two transactions
--     at signup). Default 'bundled' for cleanest UX.
--
--   tenants.security_deposit_paid — TRUE once the deposit PaymentIntent
--     has settled (set by Stripe webhook). Distinct from move_in_paid so
--     the two flows can settle independently in 'separate' mode.
--
--   tenants.security_deposit_held_amount — dollars currently held by the
--     landlord for this tenant. Set to the charged amount on payment
--     success; zeroed when refunded manually via Stripe + landlord marks
--     it returned in a future PR. (v1 doesn't auto-detect refunds.)
--
--   tenants.security_deposit_returned_at — timestamp landlord marked the
--     deposit returned. Nullable. Bookkeeping only in v1.
--
--   payments.category gets a new value: 'security_deposit'. (Column already
--     exists from 0003 — no schema change, just usage.)
--
-- Legal note: this v1 routes deposits through the landlord's standard
-- Stripe Connect account, same as rent. In several US states (NJ, NY, MA,
-- IL, CT) that's technically commingling and may not satisfy trust-account
-- requirements. Landlords in strict states should consult counsel. A
-- proper trust-account flow (separate Connect account / third-party
-- escrow) is a tracked follow-up.
--
-- Run in: Supabase Dashboard -> SQL Editor.
-- Idempotent: every ALTER uses IF NOT EXISTS.

begin;

alter table units
  add column if not exists security_deposit_amount numeric(10,2) not null default 0;

alter table profiles
  add column if not exists deposit_collection_mode text not null default 'bundled';

alter table tenants
  add column if not exists security_deposit_paid boolean not null default false;

alter table tenants
  add column if not exists security_deposit_held_amount numeric(10,2) not null default 0;

alter table tenants
  add column if not exists security_deposit_returned_at timestamptz;

commit;

-- ----------------------------------------------------------------------
-- Verification (run after migration):
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where (table_name, column_name) in (
--     ('units','security_deposit_amount'),
--     ('profiles','deposit_collection_mode'),
--     ('tenants','security_deposit_paid'),
--     ('tenants','security_deposit_held_amount'),
--     ('tenants','security_deposit_returned_at')
--   );
-- Expect 5 rows.
-- ----------------------------------------------------------------------
