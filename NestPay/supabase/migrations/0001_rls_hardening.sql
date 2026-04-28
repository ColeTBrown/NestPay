-- Migration: 0001_rls_hardening
-- Purpose: Replace every cmd:ALL policy with explicit per-verb policies, and
--          tighten the payments table so landlords can only SELECT (no UPDATE
--          or DELETE) and tenants can only SELECT/INSERT their own rows.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Idempotent: every drop uses IF EXISTS, and every create uses unique policy
-- names so re-running is safe.
--
-- IMPORTANT: this assumes the prior fix already created security-definer
-- helpers user_unit_ids() and user_property_ids(). They are referenced by the
-- existing tenant-read policies on units and properties; this migration does
-- not redefine them.

begin;

------------------------------------------------------------------------
-- properties
------------------------------------------------------------------------
-- Drop any legacy FOR ALL policy. (The previous session already split this,
-- but include the drop defensively in case the prod state still has it.)
drop policy if exists "Landlords own their properties" on properties;

-- Landlord CRUD on their own properties, split into 4 policies.
drop policy if exists "properties_landlord_select" on properties;
drop policy if exists "properties_landlord_insert" on properties;
drop policy if exists "properties_landlord_update" on properties;
drop policy if exists "properties_landlord_delete" on properties;

create policy "properties_landlord_select" on properties
  for select using (landlord_id = auth.uid());

create policy "properties_landlord_insert" on properties
  for insert with check (landlord_id = auth.uid());

create policy "properties_landlord_update" on properties
  for update using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid());

create policy "properties_landlord_delete" on properties
  for delete using (landlord_id = auth.uid());

------------------------------------------------------------------------
-- units
------------------------------------------------------------------------
drop policy if exists "Landlords see their units" on units;
drop policy if exists "units_landlord_select" on units;
drop policy if exists "units_landlord_insert" on units;
drop policy if exists "units_landlord_update" on units;
drop policy if exists "units_landlord_delete" on units;

create policy "units_landlord_select" on units
  for select using (
    property_id in (select id from properties where landlord_id = auth.uid())
  );

create policy "units_landlord_insert" on units
  for insert with check (
    property_id in (select id from properties where landlord_id = auth.uid())
  );

create policy "units_landlord_update" on units
  for update using (
    property_id in (select id from properties where landlord_id = auth.uid())
  ) with check (
    property_id in (select id from properties where landlord_id = auth.uid())
  );

create policy "units_landlord_delete" on units
  for delete using (
    property_id in (select id from properties where landlord_id = auth.uid())
  );

-- Tenant-read on units is left untouched (uses user_unit_ids() helper from
-- the prior session).

------------------------------------------------------------------------
-- tenants
------------------------------------------------------------------------
drop policy if exists "Landlords see their tenants" on tenants;
drop policy if exists "tenants_landlord_select" on tenants;
drop policy if exists "tenants_landlord_insert" on tenants;
drop policy if exists "tenants_landlord_update" on tenants;
drop policy if exists "tenants_landlord_delete" on tenants;

create policy "tenants_landlord_select" on tenants
  for select using (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

-- Landlords typically don't INSERT tenant rows (the tenant inserts their own
-- on signup via app/auth/page.tsx), but preserving the verb here matches the
-- prior FOR ALL behavior. Remove this policy if you'd rather lock it down.
create policy "tenants_landlord_insert" on tenants
  for insert with check (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

create policy "tenants_landlord_update" on tenants
  for update using (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  ) with check (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

create policy "tenants_landlord_delete" on tenants
  for delete using (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

-- Tenant self-select is preserved as-is.
drop policy if exists "tenants_self_select" on tenants;
create policy "tenants_self_select" on tenants
  for select using (user_id = auth.uid());

------------------------------------------------------------------------
-- payments  (TIGHTENED per P1.6)
------------------------------------------------------------------------
-- Drop legacy / overly permissive policies.
drop policy if exists "Landlords see their payments" on payments;
drop policy if exists "Tenants see own payments" on payments;
drop policy if exists "payments_landlord_select" on payments;
drop policy if exists "payments_landlord_insert" on payments;
drop policy if exists "payments_landlord_update" on payments;
drop policy if exists "payments_landlord_delete" on payments;
drop policy if exists "payments_tenant_select" on payments;
drop policy if exists "payments_tenant_insert" on payments;

-- Landlords: SELECT only. No INSERT / UPDATE / DELETE — payment rows are
-- owned by Stripe webhook flow (service role) and the tenant.
create policy "payments_landlord_select" on payments
  for select using (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

-- Tenants: SELECT and INSERT their own payment rows. No UPDATE/DELETE.
create policy "payments_tenant_select" on payments
  for select using (
    tenant_id in (select id from tenants where user_id = auth.uid())
  );

create policy "payments_tenant_insert" on payments
  for insert with check (
    tenant_id in (select id from tenants where user_id = auth.uid())
  );

-- No DELETE policy is created for any role. Service role bypasses RLS, so
-- automated cleanup / refunds via the webhook still work.

------------------------------------------------------------------------
-- maintenance_requests
------------------------------------------------------------------------
drop policy if exists "Tenants manage own requests" on maintenance_requests;
drop policy if exists "Landlords see all requests" on maintenance_requests;
drop policy if exists "mr_tenant_select" on maintenance_requests;
drop policy if exists "mr_tenant_insert" on maintenance_requests;
drop policy if exists "mr_tenant_update" on maintenance_requests;
drop policy if exists "mr_tenant_delete" on maintenance_requests;
drop policy if exists "mr_landlord_select" on maintenance_requests;
drop policy if exists "mr_landlord_insert" on maintenance_requests;
drop policy if exists "mr_landlord_update" on maintenance_requests;
drop policy if exists "mr_landlord_delete" on maintenance_requests;

-- Tenant: full CRUD on their own requests (preserves prior intent).
create policy "mr_tenant_select" on maintenance_requests
  for select using (
    tenant_id in (select id from tenants where user_id = auth.uid())
  );

create policy "mr_tenant_insert" on maintenance_requests
  for insert with check (
    tenant_id in (select id from tenants where user_id = auth.uid())
  );

create policy "mr_tenant_update" on maintenance_requests
  for update using (
    tenant_id in (select id from tenants where user_id = auth.uid())
  ) with check (
    tenant_id in (select id from tenants where user_id = auth.uid())
  );

create policy "mr_tenant_delete" on maintenance_requests
  for delete using (
    tenant_id in (select id from tenants where user_id = auth.uid())
  );

-- Landlord: full CRUD on requests under their units (preserves prior intent).
create policy "mr_landlord_select" on maintenance_requests
  for select using (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

create policy "mr_landlord_insert" on maintenance_requests
  for insert with check (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

create policy "mr_landlord_update" on maintenance_requests
  for update using (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  ) with check (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

create policy "mr_landlord_delete" on maintenance_requests
  for delete using (
    unit_id in (
      select u.id from units u
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

commit;

-- ----------------------------------------------------------------------
-- Verification queries (run AFTER the migration to confirm no FOR ALL
-- policies remain on the listed tables):
--
--   select schemaname, tablename, policyname, cmd
--   from pg_policies
--   where tablename in ('properties','units','tenants','payments','maintenance_requests')
--   order by tablename, policyname;
--
-- Every row should have cmd in ('SELECT','INSERT','UPDATE','DELETE') — no 'ALL'.
-- ----------------------------------------------------------------------
