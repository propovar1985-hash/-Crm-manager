-- Отдельные наценки по разделам просчётника.
alter table public.furniture_estimates
  add column if not exists markup_settings jsonb not null default '{}'::jsonb;
