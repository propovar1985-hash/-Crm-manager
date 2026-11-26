-- Каталог товаров поставщиков для просчётов мебели.
-- Цены — снимок публичного каталога на дату импорта; перед заказом перепроверять.
create table if not exists public.crm_supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.crm_suppliers(id) on delete cascade,
  section text not null,
  product_name text not null,
  article text,
  unit text not null default 'шт',
  source_price numeric(14,2) not null default 0 check (source_price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  calc_price numeric(14,2) not null default 0 check (calc_price >= 0),
  product_url text,
  availability text,
  source_updated_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, article)
);
create index if not exists crm_supplier_products_section_idx on public.crm_supplier_products(section);
create index if not exists crm_supplier_products_name_idx on public.crm_supplier_products using gin (to_tsvector('simple', product_name));
create index if not exists crm_supplier_products_supplier_idx on public.crm_supplier_products(supplier_id);
alter table public.crm_supplier_products enable row level security;
drop policy if exists "Authenticated users can read supplier products" on public.crm_supplier_products;
create policy "Authenticated users can read supplier products" on public.crm_supplier_products for select to authenticated using (true);
drop policy if exists "Authenticated users can manage supplier products" on public.crm_supplier_products;
create policy "Authenticated users can manage supplier products" on public.crm_supplier_products for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.crm_supplier_products to authenticated;

-- Стартовые позиции из открытых каталогов. Розничная цена каталога минус 30%
-- только для GINIS/AMIX/СМАРТ; для ТД Сервер скидка 0%.
insert into public.crm_supplier_products
 (supplier_id,section,product_name,article,unit,source_price,discount_percent,calc_price,product_url,availability,source_updated_at)
select s.id,v.section,v.product_name,v.article,v.unit,v.source_price,v.discount_percent,
       round(v.source_price*(1-v.discount_percent/100),2),v.product_url,v.availability,now()
from (values
 ('AMIX','3. Петли','Петля мебельная Unihopper Hutton 105° с регулируемым доводчиком, чёрный никель','HG1133.C0.B1-BKN','компл',164.00,30.00,'https://amix.biz/catalog/petli/unihopper_hinges/','В наличии'),
 ('AMIX','3. Петли','Петля мебельная AGV 107° Clip-On','AGV/00 CLIP-ON','компл',48.00,30.00,'https://amix.biz/catalog/petli/agv-clipon/','В наличии'),
 ('AMIX','3. Петли','Петля мебельная Samet Master 110° накладная с доводчиком','10100412','шт',114.00,30.00,'https://amix.biz/catalog/petli/samet-master/','В наличии'),
 ('СМАРТ','4. Направляющие и ящики','Комплект направляющих Blum TANDEM BLUMOTION полного выдвижения, L=500 мм','560H5000B','компл',4370.00,30.00,'https://smart812.ru/catalog/product/komplekt_napravlyayushchikh_tandem_blumotion_polnogo_vydvizheniya_seriya_h_16_mm_maks_zagruzka_30_kg/','В наличии'),
 ('ТД Сервер','1. Материалы','ЛДСП EGGER 2800×2070×16 Серый уголь U968 ST9','1386194','лист',4730.00,0.00,'https://www.tdserver.ru/catalog/laminirovannoe_dsp/ldsp_egger_egger/ldsp_2800x2070kh16_seryy_ugol_u968_st9_gr_5_egger/','Москва 35 листов; Санкт-Петербург 37 листов'),
 ('ТД Сервер','1. Материалы','ЛДСП EGGER 2800×2070×16 Белый классический W960 SM','1693256','лист',4147.00,0.00,'https://www.tdserver.ru/catalog/laminirovannoe_dsp/ldsp_egger_egger/','Наличие уточнять на сайте')
) as v(supplier_name,section,product_name,article,unit,source_price,discount_percent,product_url,availability)
join public.crm_suppliers s on s.name=v.supplier_name
on conflict (supplier_id,article) do update set
 section=excluded.section,product_name=excluded.product_name,unit=excluded.unit,
 source_price=excluded.source_price,discount_percent=excluded.discount_percent,
 calc_price=excluded.calc_price,product_url=excluded.product_url,
 availability=excluded.availability,source_updated_at=now(),updated_at=now();
