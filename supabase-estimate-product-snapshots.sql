-- Связь строк просчёта с каталогом поставщиков и фиксация цены на дату выбора.
-- Обновление каталога не меняет сохранённые source_price/unit_price snapshots.
alter table public.furniture_estimate_lines
  add column if not exists supplier_product_id uuid,
  add column if not exists price_checked_at timestamptz;

alter table public.furniture_estimate_items
  add column if not exists supplier_product_id uuid,
  add column if not exists price_checked_at timestamptz;

create index if not exists furniture_estimate_lines_product_idx
  on public.furniture_estimate_lines(supplier_product_id);
create index if not exists furniture_estimate_items_product_idx
  on public.furniture_estimate_items(supplier_product_id);
