-- Строки сметы по прайсу из «РАСЧЕТ ЗАКАЗОВ.xlsx»
create table if not exists public.furniture_estimate_lines (
 id uuid primary key default gen_random_uuid(),
 estimate_id uuid not null references public.furniture_estimates(id) on delete cascade,
 category text not null,
 item_name text not null,
 unit text not null default 'шт',
 quantity numeric(14,3) not null default 1,
 unit_price numeric(14,2) not null default 0,
 markup_percent numeric(8,2) not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists furniture_estimate_lines_estimate_idx on public.furniture_estimate_lines(estimate_id);
alter table public.furniture_estimate_lines enable row level security;
drop policy if exists "authenticated manage furniture estimate lines" on public.furniture_estimate_lines;
create policy "authenticated manage furniture estimate lines" on public.furniture_estimate_lines for all to authenticated using (true) with check (true);
grant select,insert,update,delete on public.furniture_estimate_lines to authenticated;
