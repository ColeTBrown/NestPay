-- Run this entire file in: Supabase → SQL Editor → New query → Run

create table properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid references auth.users(id) on delete cascade,
  name text not null,
  address text not null,
  created_at timestamptz default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  unit_number text not null,
  monthly_rent numeric(10,2) not null,
  created_at timestamptz default now()
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  unit_id uuid references units(id) on delete cascade,
  full_name text not null,
  email text not null,
  stripe_customer_id text,
  stripe_payment_method_id text,
  autopay_enabled boolean default false,
  lease_start date,
  lease_end date,
  created_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  unit_id uuid references units(id),
  amount numeric(10,2) not null,
  stripe_payment_intent_id text,
  status text not null default 'pending',
  payment_month text not null,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  unit_id uuid references units(id),
  title text not null,
  description text,
  category text not null,
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- Row Level Security
alter table properties enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table payments enable row level security;
alter table maintenance_requests enable row level security;

create policy "Landlords own their properties"
  on properties for all using (landlord_id = auth.uid());

create policy "Tenants see their unit"
  on units for select
  using (id in (select unit_id from tenants where user_id = auth.uid()));

create policy "Landlords see their units"
  on units for all
  using (property_id in (select id from properties where landlord_id = auth.uid()));

create policy "Tenants see themselves"
  on tenants for select using (user_id = auth.uid());

create policy "Landlords see their tenants"
  on tenants for all
  using (unit_id in (
    select u.id from units u
    join properties p on p.id = u.property_id
    where p.landlord_id = auth.uid()
  ));

create policy "Tenants see own payments"
  on payments for select
  using (tenant_id in (select id from tenants where user_id = auth.uid()));

create policy "Landlords see their payments"
  on payments for all
  using (unit_id in (
    select u.id from units u
    join properties p on p.id = u.property_id
    where p.landlord_id = auth.uid()
  ));

create policy "Tenants manage own requests"
  on maintenance_requests for all
  using (tenant_id in (select id from tenants where user_id = auth.uid()));

create policy "Landlords see all requests"
  on maintenance_requests for all
  using (unit_id in (
    select u.id from units u
    join properties p on p.id = u.property_id
    where p.landlord_id = auth.uid()
  ));