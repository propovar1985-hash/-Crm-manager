-- CRM «Мастер мебельщик»: справочник поставщиков
create table if not exists public.crm_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Другое',
  website_url text not null,
  additional_links text[] not null default '{}',
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_suppliers_name_idx on public.crm_suppliers (name);
create index if not exists crm_suppliers_category_idx on public.crm_suppliers (category);
alter table public.crm_suppliers enable row level security;
drop policy if exists "Authenticated users can read suppliers" on public.crm_suppliers;
create policy "Authenticated users can read suppliers" on public.crm_suppliers
  for select to authenticated using (true);
drop policy if exists "Authenticated users can insert suppliers" on public.crm_suppliers;
create policy "Authenticated users can insert suppliers" on public.crm_suppliers
  for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update suppliers" on public.crm_suppliers;
create policy "Authenticated users can update suppliers" on public.crm_suppliers
  for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete suppliers" on public.crm_suppliers;
create policy "Authenticated users can delete suppliers" on public.crm_suppliers
  for delete to authenticated using (true);
grant select, insert, update, delete on public.crm_suppliers to authenticated;

insert into public.crm_suppliers (name,category,website_url,discount_percent)
values
 ('GINIS','Фурнитура','https://ginis.ru/catalog/',30),
 ('AMIX','Фурнитура','https://amix.biz/',30),
 ('СМАРТ','Фурнитура','https://smart812.ru/',30),
 ('ТД Сервер','Материалы','https://www.tdserver.ru/catalog/laminirovannoe_dsp/ldsp_egger_egger/',0)
on conflict do nothing;
