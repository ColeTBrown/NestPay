-- db/cleanup-test-data.sql
-- Deletes test properties (and cascades to units / tenants / payments /
-- maintenance_requests via the ON DELETE CASCADE foreign keys defined in
-- supabase/schema.sql).
--
-- Targets properties whose name (case-insensitive) is "test", "120 test",
-- or "Example".
--
-- DO NOT RUN BLINDLY. Review the preview block first, confirm the rows are
-- what you expect, then run the DELETE inside the transaction.
--
-- Run in: Supabase Dashboard -> SQL Editor.

-- ---------- Preview: see what will be deleted ----------
-- Run this SELECT first by itself to inspect the matched rows.
-- (Comment it out or skip it before running the DELETE block.)

select id, landlord_id, name, address, created_at
from properties
where lower(name) in ('test', '120 test', 'example');

-- Cascading children (informational — these will be removed automatically
-- when the parent property is deleted, thanks to ON DELETE CASCADE):
select 'units' as table_name, count(*)
from units
where property_id in (
  select id from properties
  where lower(name) in ('test', '120 test', 'example')
)
union all
select 'tenants', count(*)
from tenants
where unit_id in (
  select u.id from units u
  join properties p on p.id = u.property_id
  where lower(p.name) in ('test', '120 test', 'example')
)
union all
select 'payments', count(*)
from payments
where unit_id in (
  select u.id from units u
  join properties p on p.id = u.property_id
  where lower(p.name) in ('test', '120 test', 'example')
)
union all
select 'maintenance_requests', count(*)
from maintenance_requests
where unit_id in (
  select u.id from units u
  join properties p on p.id = u.property_id
  where lower(p.name) in ('test', '120 test', 'example')
);

-- ---------- DELETE block ----------
-- Wrapped in a transaction so you can ROLLBACK if the row counts look wrong.
-- Run as a separate query after reviewing the preview above.
--
-- begin;
--
-- delete from properties
-- where lower(name) in ('test', '120 test', 'example');
--
-- -- If counts look right:
-- -- commit;
-- -- Otherwise:
-- -- rollback;
