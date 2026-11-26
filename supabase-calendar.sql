-- CRM calendar events. Run once in Supabase SQL Editor.
create table if not exists public.crm_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'Задача',
  assigned_to text,
  start_at timestamptz not null,
  end_at timestamptz,
  related_label text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_calendar_events enable row level security;

drop policy if exists "Authenticated users manage calendar events" on public.crm_calendar_events;
create policy "Authenticated users manage calendar events"
on public.crm_calendar_events for all to authenticated
using (true) with check (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.crm_calendar_events to authenticated;
