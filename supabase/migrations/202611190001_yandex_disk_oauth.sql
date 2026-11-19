-- Yandex Disk OAuth connections and pending authorization states.
create extension if not exists pgcrypto;

create table if not exists public.yandex_disk_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token_ciphertext text not null,
  token_expires_at timestamptz,
  root_folder_path text not null default 'disk:/',
  connected_at timestamptz not null default now()
);

create table if not exists public.yandex_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.yandex_disk_connections enable row level security;
alter table public.yandex_oauth_states enable row level security;

-- No direct client access to tokens or OAuth states. Edge Function uses service role.
drop policy if exists "Users cannot read Yandex tokens directly" on public.yandex_disk_connections;
drop policy if exists "Users cannot access Yandex OAuth states directly" on public.yandex_oauth_states;

revoke all on public.yandex_disk_connections from anon, authenticated;
revoke all on public.yandex_oauth_states from anon, authenticated;

create index if not exists yandex_oauth_states_expiry_idx
  on public.yandex_oauth_states(expires_at);
