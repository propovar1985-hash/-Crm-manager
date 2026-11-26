-- Интеграция поставщиков в строки расчёта мебели.
-- Сохраняем поставщика и цены снимком, чтобы изменение скидки в справочнике
-- не меняло уже сохранённые расчёты.
alter table public.furniture_estimate_lines
  add column if not exists supplier_id uuid,
  add column if not exists supplier_name text,
  add column if not exists supplier_discount_percent numeric(8,2) not null default 0,
  add column if not exists source_unit_price numeric(14,2) not null default 0;

update public.furniture_estimate_lines
set source_unit_price = unit_price
where source_unit_price = 0 and unit_price <> 0;

alter table public.furniture_estimate_items
  add column if not exists supplier_id uuid,
  add column if not exists supplier_name text,
  add column if not exists supplier_discount_percent numeric(8,2) not null default 0,
  add column if not exists source_material_price_m2 numeric(14,2) not null default 0;

update public.furniture_estimate_items
set source_material_price_m2 = material_price_m2
where source_material_price_m2 = 0 and material_price_m2 <> 0;
