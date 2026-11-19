-- Вложения заказов: приватное хранилище для LiDAR и файлов проектов.
-- Выполнить один раз в Supabase SQL Editor после supabase-orders.sql.

insert into storage.buckets (id, name, public, file_size_limit)
values ('order-files', 'order-files', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = 104857600;

create table if not exists public.furniture_order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.furniture_orders(id) on delete cascade,
  category text not null check (category in ('lidar','project')),
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists furniture_order_files_order_idx
  on public.furniture_order_files(order_id, created_at);

alter table public.furniture_order_files enable row level security;

drop policy if exists "authenticated users can read order files metadata" on public.furniture_order_files;
create policy "authenticated users can read order files metadata"
on public.furniture_order_files for select to authenticated using (true);

drop policy if exists "authenticated users can add order files metadata" on public.furniture_order_files;
create policy "authenticated users can add order files metadata"
on public.furniture_order_files for insert to authenticated with check (true);

drop policy if exists "authenticated users can delete order files metadata" on public.furniture_order_files;
create policy "authenticated users can delete order files metadata"
on public.furniture_order_files for delete to authenticated using (true);

drop policy if exists "authenticated users can upload order files" on storage.objects;
create policy "authenticated users can upload order files"
on storage.objects for insert to authenticated
with check (bucket_id = 'order-files');

drop policy if exists "authenticated users can read order files" on storage.objects;
create policy "authenticated users can read order files"
on storage.objects for select to authenticated
using (bucket_id = 'order-files');

drop policy if exists "authenticated users can delete order files" on storage.objects;
create policy "authenticated users can delete order files"
on storage.objects for delete to authenticated
using (bucket_id = 'order-files');

notify pgrst, 'reload schema';
