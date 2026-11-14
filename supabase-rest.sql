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
