-- Замеры и просчёты CRM «Мастер мебельщик». Выполнить один раз в Supabase SQL Editor.
create table if not exists public.furniture_measurements (
 id uuid primary key default gen_random_uuid(),
 order_id uuid references public.furniture_orders(id) on delete set null,
 client_name text not null,
 phone text,
 address text,
 measured_at date,
 manager text,
 room_name text,
 room_length_mm integer,
 room_width_mm integer,
 room_height_mm integer,
 wall_dimensions text,
 openings_notes text,
 utilities_notes text,
 comments text,
 lidar_path text,
 project_path text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.furniture_estimates (
 id uuid primary key default gen_random_uuid(),
 estimate_no text,
 order_id uuid references public.furniture_orders(id) on delete set null,
 measurement_id uuid references public.furniture_measurements(id) on delete set null,
 client_name text not null,
 title text not null,
 status text not null default 'Черновик',
 sheet_length_mm integer not null default 2800,
 sheet_width_mm integer not null default 2070,
 markup_percent numeric(8,2) not null default 30,
 fittings_cost numeric(14,2) not null default 0,
 labor_cost numeric(14,2) not null default 0,
 other_cost numeric(14,2) not null default 0,
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.furniture_estimate_items (
 id uuid primary key default gen_random_uuid(),
 estimate_id uuid not null references public.furniture_estimates(id) on delete cascade,
 item_name text not null,
 material text not null default 'ЛДСП 16 мм',
 width_mm integer not null default 0,
 height_mm integer not null default 0,
 quantity integer not null default 1,
 edge_m numeric(12,3) not null default 0,
 material_price_m2 numeric(14,2) not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists furniture_measurements_order_idx on public.furniture_measurements(order_id);
create index if not exists furniture_estimates_order_idx on public.furniture_estimates(order_id);
create index if not exists furniture_estimate_items_estimate_idx on public.furniture_estimate_items(estimate_id);
alter table public.furniture_measurements enable row level security;
alter table public.furniture_estimates enable row level security;
alter table public.furniture_estimate_items enable row level security;
drop policy if exists "authenticated manage furniture measurements" on public.furniture_measurements;
create policy "authenticated manage furniture measurements" on public.furniture_measurements for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage furniture estimates" on public.furniture_estimates;
create policy "authenticated manage furniture estimates" on public.furniture_estimates for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage furniture estimate items" on public.furniture_estimate_items;
create policy "authenticated manage furniture estimate items" on public.furniture_estimate_items for all to authenticated using (true) with check (true);
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.furniture_measurements,public.furniture_estimates,public.furniture_estimate_items to authenticated;

-- Закрытое хранилище файлов замеров. Файлы доступны только вошедшим пользователям CRM.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('crm-project-files','crm-project-files',false,524288000,null)
on conflict (id) do nothing;
drop policy if exists "CRM users upload project files" on storage.objects;
create policy "CRM users upload project files" on storage.objects for insert to authenticated with check (bucket_id='crm-project-files');
drop policy if exists "CRM users read project files" on storage.objects;
create policy "CRM users read project files" on storage.objects for select to authenticated using (bucket_id='crm-project-files');
drop policy if exists "CRM users update project files" on storage.objects;
create policy "CRM users update project files" on storage.objects for update to authenticated using (bucket_id='crm-project-files') with check (bucket_id='crm-project-files');
