-- ЕДИНАЯ МИГРАЦИЯ CRM «МАСТЕР МЕБЕЛЬЩИК»
-- Запускать один раз в Supabase SQL Editor. Сначала создаются заказы, затем производство и остальные модули.

-- Миграция CRM «Мастер мебельщик»: карточки заказов и история.
-- Выполнять в Supabase SQL Editor один раз.
-- Все авторизованные пользователи проекта имеют доступ к общим заказам.
-- Для нескольких независимых компаний позже добавьте tenant_id и политики по организациям.

create table if not exists public.furniture_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,
  client_name text not null,
  phone text,
  address text,
  furniture_type text,
  title text not null,
  stage text not null default 'Новый',
  manager text,
  due_date date,
  amount numeric(14,2) not null default 0,
  payment_status text,
  description text,
  length_mm integer,
  height_mm integer,
  depth_mm integer,
  measure_date date,
  lidar_url text,
  project_url text,
  project_notes text,
  body_material text,
  facades text,
  worktop text,
  edge_band text,
  hardware text,
  supplier text,
  specification text,
  documents_url text,
  production_start date,
  production_due date,
  production_stage text,
  quality_notes text,
  delivery_date date,
  installation_date date,
  installation_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.furniture_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.furniture_orders(id) on delete cascade,
  event_type text not null,
  details text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists furniture_orders_created_at_idx on public.furniture_orders(created_at desc);
create index if not exists furniture_orders_stage_idx on public.furniture_orders(stage);
create index if not exists furniture_orders_client_idx on public.furniture_orders(client_name);
create index if not exists furniture_order_events_order_idx on public.furniture_order_events(order_id, created_at desc);

alter table public.furniture_orders enable row level security;
alter table public.furniture_order_events enable row level security;

drop policy if exists "authenticated users can read furniture orders" on public.furniture_orders;
create policy "authenticated users can read furniture orders"
on public.furniture_orders for select to authenticated using (true);

drop policy if exists "authenticated users can insert furniture orders" on public.furniture_orders;
create policy "authenticated users can insert furniture orders"
on public.furniture_orders for insert to authenticated with check (true);

drop policy if exists "authenticated users can update furniture orders" on public.furniture_orders;
create policy "authenticated users can update furniture orders"
on public.furniture_orders for update to authenticated using (true) with check (true);

drop policy if exists "authenticated users can delete furniture orders" on public.furniture_orders;
create policy "authenticated users can delete furniture orders"
on public.furniture_orders for delete to authenticated using (true);

drop policy if exists "authenticated users can read order events" on public.furniture_order_events;
create policy "authenticated users can read order events"
on public.furniture_order_events for select to authenticated using (true);

drop policy if exists "authenticated users can add order events" on public.furniture_order_events;
create policy "authenticated users can add order events"
on public.furniture_order_events for insert to authenticated with check (true);

-- Автонумерация при сохранении нового заказа, если номер не указан вручную.
create sequence if not exists public.furniture_order_number_seq;
create or replace function public.assign_furniture_order_number()
returns trigger language plpgsql as $$
begin
  if new.order_no is null or btrim(new.order_no) = '' then
    new.order_no := 'ММ-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.furniture_order_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists furniture_order_number_trigger on public.furniture_orders;
create trigger furniture_order_number_trigger
before insert on public.furniture_orders
for each row execute function public.assign_furniture_order_number();


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


-- Миграция дополнительных модулей CRM. Выполнить после supabase-orders.sql.
create table if not exists public.furniture_tasks (
 id uuid primary key default gen_random_uuid(),
 title text not null, details text, due_at timestamptz, assignee text,
 status text not null default 'Новая',
 order_id uuid references public.furniture_orders(id) on delete set null,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.furniture_service_cases (
 id uuid primary key default gen_random_uuid(),
 client_name text not null, order_id uuid references public.furniture_orders(id) on delete set null,
 title text not null, category text not null default 'Другое', description text,
 assignee text, due_date date, status text not null default 'Новое',
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.furniture_catalog (
 id uuid primary key default gen_random_uuid(),
 name text not null, category text not null, brand text, article text, decor text,
 thickness_mm numeric, sheet_format text, image_url text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.furniture_knowledge (
 id uuid primary key default gen_random_uuid(),
 title text not null, role text not null default 'Для всех', body text not null,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['furniture_tasks','furniture_service_cases','furniture_catalog','furniture_knowledge'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists "auth read %1$s" on public.%1$I',t);
  execute format('create policy "auth read %1$s" on public.%1$I for select to authenticated using (true)',t);
  execute format('drop policy if exists "auth insert %1$s" on public.%1$I',t);
  execute format('create policy "auth insert %1$s" on public.%1$I for insert to authenticated with check (true)',t);
  execute format('drop policy if exists "auth update %1$s" on public.%1$I',t);
  execute format('create policy "auth update %1$s" on public.%1$I for update to authenticated using (true) with check (true)',t);
  execute format('drop policy if exists "auth delete %1$s" on public.%1$I',t);
  execute format('create policy "auth delete %1$s" on public.%1$I for delete to authenticated using (true)',t);
 end loop;
end $$;
