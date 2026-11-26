-- Файлы замеров и проектов, загружаемые непосредственно на Яндекс Диск.
-- Выполнить один раз в Supabase SQL Editor.

create table if not exists public.furniture_measurement_files (
  id uuid primary key default gen_random_uuid(),
  measurement_id uuid not null references public.furniture_measurements(id) on delete cascade,
  category text not null check (category in ('lidar','project')),
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  provider text not null default 'yandex',
  external_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists furniture_measurement_files_measurement_idx
  on public.furniture_measurement_files(measurement_id, created_at);

alter table public.furniture_measurement_files enable row level security;

drop policy if exists "authenticated users can read measurement files metadata" on public.furniture_measurement_files;
create policy "authenticated users can read measurement files metadata"
on public.furniture_measurement_files for select to authenticated using (true);

drop policy if exists "authenticated users can add measurement files metadata" on public.furniture_measurement_files;
create policy "authenticated users can add measurement files metadata"
on public.furniture_measurement_files for insert to authenticated with check (true);

drop policy if exists "authenticated users can delete measurement files metadata" on public.furniture_measurement_files;
create policy "authenticated users can delete measurement files metadata"
on public.furniture_measurement_files for delete to authenticated using (true);

grant select, insert, delete on public.furniture_measurement_files to authenticated;
notify pgrst, 'reload schema';
