-- 0005_properties.sql
-- properties: Core Asset entity. Fields per SRS §9. Must support Israel + US,
-- all known property types and lifecycle stages, without future rebuild.

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state_province text,
  postal_code text,
  country text not null,
  timezone text,
  locale text not null default 'he-IL',
  default_currency text not null
    check (default_currency in ('ILS','USD')),
  property_type text not null
    check (property_type in (
      'apartment','single_family_home','private_house',
      'vacant_land','commercial','other'
    )),
  property_stage text not null default 'operating'
    check (property_stage in (
      'planned','under_construction','operating','vacant',
      'urban_renewal','renovation','sold','inactive'
    )),
  acquisition_date date,
  acquisition_cost numeric(14,2),
  current_market_value numeric(14,2),
  management_company text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.properties is 'Core asset entity. property_type/property_stage cover every known scenario (SRS §9) so land, construction, urban renewal, sold, etc. do not require schema changes.';

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create index if not exists idx_properties_active on public.properties(active);
create index if not exists idx_properties_country on public.properties(country);
create index if not exists idx_properties_stage on public.properties(property_stage);

alter table public.properties enable row level security;
