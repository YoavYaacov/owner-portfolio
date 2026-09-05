-- 0008_configuration.sql
-- configuration: business-rule thresholds must be data-driven, not hardcoded
-- (SRS §32). Key-value shape keeps this extensible without new migrations
-- every time a new tunable rule is added.

create table if not exists public.configuration (
  config_key text primary key,
  config_value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

comment on table public.configuration is 'Data-driven business rule thresholds (alert windows, anomaly thresholds, etc). Never hardcode these in application code (SRS §32).';

drop trigger if exists trg_configuration_updated_at on public.configuration;
create trigger trg_configuration_updated_at
  before update on public.configuration
  for each row execute function public.set_updated_at();

alter table public.configuration enable row level security;

-- Seed defaults required by SRS §32. Safe to re-run (ON CONFLICT DO NOTHING).
insert into public.configuration (config_key, config_value, description) values
  ('lease_alert_days', '30', 'ימים לפני סיום חוזה שכירות להצגת התראה'),
  ('insurance_alert_days', '30', 'ימים לפני פקיעת ביטוח להצגת התראה'),
  ('loan_alert_days', '60', 'ימים לפני פדיון הלוואה להצגת התראה'),
  ('anomaly_multiplier', '2.0', 'מכפיל מעל ממוצע היסטורי להגדרת הוצאה חריגה'),
  ('minimum_anomaly_amount', '500', 'סכום מינימלי לפני שהוצאה נבדקת כחריגה'),
  ('low_reserve_threshold', '5000', 'סף רזרבה נמוכה להתראה'),
  ('default_reporting_period', '"monthly"', 'תקופת דיווח ברירת מחדל בדוחות')
on conflict (config_key) do nothing;
