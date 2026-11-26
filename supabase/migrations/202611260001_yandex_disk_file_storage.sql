-- Store Yandex Disk file metadata alongside existing Supabase Storage records.
alter table public.furniture_order_files
  add column if not exists provider text not null default 'supabase',
  add column if not exists external_url text;

create index if not exists furniture_order_files_provider_idx
  on public.furniture_order_files(provider);
