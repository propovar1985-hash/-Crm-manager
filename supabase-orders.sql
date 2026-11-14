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
