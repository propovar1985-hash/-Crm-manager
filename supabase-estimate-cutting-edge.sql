-- Расширение деталировки: материал листа, кромка и выбранные стороны.
-- Без удаления или изменения существующих смет и строк.
alter table public.furniture_estimate_items
  add column if not exists edge_catalog_item_id uuid references public.furniture_estimate_catalog(id) on delete set null,
  add column if not exists edge_sides jsonb not null default '{"top":false,"right":false,"bottom":false,"left":false}'::jsonb,
  add column if not exists edge_m numeric(12,3) not null default 0,
  add column if not exists edge_price_per_m numeric(14,2) not null default 0,
  add column if not exists material_price_sheet numeric(14,2) not null default 0;
create index if not exists furniture_estimate_items_edge_catalog_idx
  on public.furniture_estimate_items(edge_catalog_item_id);
