-- Migration: 0006_esign_provider_metadata
-- Purpose: PR B foundation — adds e-signature provider metadata to the
--          documents library and creates the signed-leases storage bucket
--          for final signed PDFs + audit trail certificates.
--
-- Design choices:
--   - lease_documents.provider: text column defaulting to 'signwell'.
--     Future-proofing for the "let landlord pick their e-sign provider"
--     follow-up (DocuSign etc.) without forcing a schema migration when
--     that lands. The abstraction layer in lib/esign reads this column
--     to dispatch to the right provider implementation.
--   - lease_documents.template_id: opaque external ID. Set once the
--     landlord finishes the embedded "Setup merge fields" step in
--     Dropbox Sign. Null = no template, just sign-as-is. Non-null =
--     signature requests should be created from this template with
--     merge field values populated.
--   - lease_signatures.tenant_sign_url + expires_at: Dropbox Sign's
--     embedded sign URLs expire after ~5 minutes by spec. We cache the
--     URL briefly to avoid an extra API hop if the tenant clicks Sign
--     twice in a row, and re-fetch once it expires.
--   - signed-leases bucket: separate from lease-documents so we can
--     apply different retention rules (e.g. signed leases never deleted,
--     even if the landlord deletes the source template) and different
--     RLS (tenants can read their own signed copies).
--
-- Idempotent: ALTER TABLE IF NOT EXISTS via DO blocks, policies use
-- DROP/CREATE pattern.

begin;

------------------------------------------------------------------------
-- lease_documents: e-sign provider + template id
------------------------------------------------------------------------
alter table lease_documents
  add column if not exists provider text not null default 'signwell',
  add column if not exists template_id text;

------------------------------------------------------------------------
-- lease_signatures: cached embedded sign URL
------------------------------------------------------------------------
alter table lease_signatures
  add column if not exists tenant_sign_url text,
  add column if not exists tenant_sign_url_expires_at timestamptz;

------------------------------------------------------------------------
-- Storage bucket: signed-leases
-- Final signed PDFs + audit trail certificates land here. Path
-- convention: {landlord_id}/{signature_id}.pdf for the signed copy
-- and {landlord_id}/{signature_id}.audit.pdf for the certificate.
------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('signed-leases', 'signed-leases', false)
on conflict (id) do nothing;

-- Landlord can read signed PDFs for their tenants (path prefix = landlord uid).
drop policy if exists "signed_leases_landlord_select" on storage.objects;
create policy "signed_leases_landlord_select" on storage.objects
  for select using (
    bucket_id = 'signed-leases'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Tenant can read their own signed PDFs. The path prefix is the
-- landlord's uid, but the second path segment is the signature_id —
-- we cross-check that the signature belongs to this tenant.
drop policy if exists "signed_leases_tenant_select" on storage.objects;
create policy "signed_leases_tenant_select" on storage.objects
  for select using (
    bucket_id = 'signed-leases'
    and exists (
      select 1 from lease_signatures s
      join tenants t on t.id = s.tenant_id
      where t.user_id = auth.uid()
        and s.signed_file_path = name
    )
  );

-- Only the service role (webhook handler) inserts into this bucket.
-- No public insert policy — server-side uploads use the service role
-- via supabaseAdmin which bypasses RLS.

commit;

-- ----------------------------------------------------------------------
-- Verification:
--   select column_name from information_schema.columns
--     where table_name = 'lease_documents'
--       and column_name in ('provider','template_id');
--   -- Expect 2 rows.
--
--   select column_name from information_schema.columns
--     where table_name = 'lease_signatures'
--       and column_name in ('tenant_sign_url','tenant_sign_url_expires_at');
--   -- Expect 2 rows.
--
--   select id from storage.buckets where id = 'signed-leases';
--   -- Expect 1 row.
-- ----------------------------------------------------------------------
