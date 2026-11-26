-- Чек-лист замера: отдельная таблица, существующие замеры не изменяются.
create table if not exists public.furniture_measurement_checklists (
  measurement_id uuid primary key,
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.furniture_measurement_checklists enable row level security;

grant select, insert, update, delete
on table public.furniture_measurement_checklists
to authenticated;

drop policy if exists "Authenticated users manage measurement checklists"
on public.furniture_measurement_checklists;

create policy "Authenticated users manage measurement checklists"
on public.furniture_measurement_checklists
for all
to authenticated
using (true)
with check (true);
