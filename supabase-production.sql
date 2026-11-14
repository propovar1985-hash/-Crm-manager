-- Миграция: этапы производства и контроль качества.
-- Выполнить один раз в Supabase SQL Editor после supabase-orders.sql.

create table if not exists public.furniture_production_events (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.furniture_orders(id) on delete cascade,
 stage text not null,
 details text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.furniture_quality_checks (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.furniture_orders(id) on delete cascade,
 result text not null,
 notes text,
 passed boolean not null default false,
 checked_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create index if not exists furniture_production_events_order_idx
 on public.furniture_production_events(order_id,created_at desc);
create index if not exists furniture_quality_checks_order_idx
 on public.furniture_quality_checks(order_id,created_at desc);

alter table public.furniture_production_events enable row level security;
alter table public.furniture_quality_checks enable row level security;

drop policy if exists "authenticated production events read" on public.furniture_production_events;
create policy "authenticated production events read" on public.furniture_production_events
 for select to authenticated using (true);
drop policy if exists "authenticated production events insert" on public.furniture_production_events;
create policy "authenticated production events insert" on public.furniture_production_events
 for insert to authenticated with check (true);

drop policy if exists "authenticated quality checks read" on public.furniture_quality_checks;
create policy "authenticated quality checks read" on public.furniture_quality_checks
 for select to authenticated using (true);
drop policy if exists "authenticated quality checks insert" on public.furniture_quality_checks;
create policy "authenticated quality checks insert" on public.furniture_quality_checks
 for insert to authenticated with check (true);
