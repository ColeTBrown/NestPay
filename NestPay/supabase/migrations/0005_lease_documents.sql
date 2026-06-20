-- Migration: 0005_lease_documents
-- Purpose: Schema for landlord-managed lease documents library + per-tenant
--          signature requests. Foundation for the Dropbox Sign e-signature
--          flow that lands in PR B.
--
-- Design choices:
--   - lease_documents is the LIBRARY. Each row is a file the landlord has
--     uploaded. Templates (is_template = true) can be assigned to multiple
--     tenants; ad-hoc uploads (is_template = false) are tied to one tenant.
--   - lease_signatures is the per-tenant ASSIGNMENT + signing state. One row
--     per document a tenant needs to sign. PR B adds the signature_request_id
--     once Dropbox Sign is integrated; until then status stays 'pending'.
--   - required_for_move_in lives on lease_signatures (not lease_documents)
--     because the landlord decides per-assignment whether THIS tenant must
--     sign THIS doc before paying rent. A template might be "required" for
--     one tenant and "optional" for another.
--   - File storage: Supabase Storage bucket 'lease-documents' with paths
--     formatted as {landlord_id}/{document_id}.pdf. The RLS policy uses
--     storage.foldername(name) to check the prefix matches auth.uid().
--   - Signed PDFs (PR B) will land in a separate bucket 'signed-leases' so
--     we can apply different retention/lifecycle rules to originals vs
--     signed copies.
--
-- Run in: Supabase Dashboard -> SQL Editor.
-- Idempotent: all creates use IF NOT EXISTS where supported; policies use
-- DROP/CREATE pattern.

begin;

------------------------------------------------------------------------
-- lease_documents — landlord's uploaded files
------------------------------------------------------------------------
create table if not exists lease_documents (
  id                    uuid primary key default gen_random_uuid(),
  landlord_id           uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  description           text,
  file_path             text not null,           -- Supabase Storage path
  file_size_bytes       int,
  mime_type             text,
  is_template           boolean not null default true,
  created_at            timestamptz not null default now()
);

create index if not exists lease_documents_landlord_idx on lease_documents(landlord_id);

alter table lease_documents enable row level security;

drop policy if exists "lease_documents_landlord_select" on lease_documents;
create policy "lease_documents_landlord_select" on lease_documents
  for select using (landlord_id = auth.uid());

drop policy if exists "lease_documents_landlord_insert" on lease_documents;
create policy "lease_documents_landlord_insert" on lease_documents
  for insert with check (landlord_id = auth.uid());

drop policy if exists "lease_documents_landlord_update" on lease_documents;
create policy "lease_documents_landlord_update" on lease_documents
  for update using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid());

drop policy if exists "lease_documents_landlord_delete" on lease_documents;
create policy "lease_documents_landlord_delete" on lease_documents
  for delete using (landlord_id = auth.uid());

------------------------------------------------------------------------
-- lease_signatures — per-tenant assignment + signing state
------------------------------------------------------------------------
create table if not exists lease_signatures (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  document_id             uuid not null references lease_documents(id) on delete restrict,
  required_for_move_in    boolean not null default true,
  status                  text not null default 'pending',  -- pending | awaiting_signature | signed | declined | expired
  signature_request_id    text,                              -- Dropbox Sign external ID (PR B)
  signed_at               timestamptz,
  signed_file_path        text,                              -- Supabase Storage path to final PDF (PR B)
  audit_trail_path        text,                              -- Supabase Storage path to audit cert (PR B)
  created_at              timestamptz not null default now()
);

create index if not exists lease_signatures_tenant_idx on lease_signatures(tenant_id);
create index if not exists lease_signatures_status_idx on lease_signatures(status);
create unique index if not exists lease_signatures_tenant_doc_uniq
  on lease_signatures(tenant_id, document_id);

alter table lease_signatures enable row level security;

-- Landlord sees signatures for their tenants (joined via unit -> property).
drop policy if exists "lease_signatures_landlord_select" on lease_signatures;
create policy "lease_signatures_landlord_select" on lease_signatures
  for select using (
    tenant_id in (
      select t.id from tenants t
      join units u on u.id = t.unit_id
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

drop policy if exists "lease_signatures_landlord_insert" on lease_signatures;
create policy "lease_signatures_landlord_insert" on lease_signatures
  for insert with check (
    tenant_id in (
      select t.id from tenants t
      join units u on u.id = t.unit_id
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
  );

-- Landlord can update the required_for_move_in flag while pending.
drop policy if exists "lease_signatures_landlord_update" on lease_signatures;
create policy "lease_signatures_landlord_update" on lease_signatures
  for update using (
    tenant_id in (
      select t.id from tenants t
      join units u on u.id = t.unit_id
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
    and status = 'pending'
  );

-- Landlord can unassign while pending.
drop policy if exists "lease_signatures_landlord_delete" on lease_signatures;
create policy "lease_signatures_landlord_delete" on lease_signatures
  for delete using (
    tenant_id in (
      select t.id from tenants t
      join units u on u.id = t.unit_id
      join properties p on p.id = u.property_id
      where p.landlord_id = auth.uid()
    )
    and status = 'pending'
  );

-- Tenant sees their own assignments (needed in PR B when tenant signs).
drop policy if exists "lease_signatures_tenant_select" on lease_signatures;
create policy "lease_signatures_tenant_select" on lease_signatures
  for select using (
    tenant_id in (select id from tenants where user_id = auth.uid())
  );

------------------------------------------------------------------------
-- Supabase Storage: lease-documents bucket
------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('lease-documents', 'lease-documents', false)
on conflict (id) do nothing;

-- Storage RLS: landlord can manage their own folder (paths start with their uid).
-- File path convention: {landlord_id}/{document_id}.{ext}

drop policy if exists "lease_documents_storage_landlord_upload" on storage.objects;
create policy "lease_documents_storage_landlord_upload" on storage.objects
  for insert with check (
    bucket_id = 'lease-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "lease_documents_storage_landlord_select" on storage.objects;
create policy "lease_documents_storage_landlord_select" on storage.objects
  for select using (
    bucket_id = 'lease-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "lease_documents_storage_landlord_delete" on storage.objects;
create policy "lease_documents_storage_landlord_delete" on storage.objects
  for delete using (
    bucket_id = 'lease-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Tenant read access for their assigned documents lands in PR B alongside
-- the signing flow. Keeping the storage policies tight for now.

commit;

-- ----------------------------------------------------------------------
-- Verification (run after migration):
--   select table_name from information_schema.tables
--   where table_name in ('lease_documents','lease_signatures');
--   -- Expect 2 rows.
--
--   select bucket_id from storage.buckets where id = 'lease-documents';
--   -- Expect 1 row.
-- ----------------------------------------------------------------------
