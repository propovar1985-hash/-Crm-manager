-- Исправление единиц измерения каталога по исходной книге пользователя.
-- Цены и наименования не меняются.
update public.furniture_estimate_catalog set unit='м²', updated_at=now()
where (category='Облицовка и фасады' and item_name in ('ФАСАДЫ ПВХ ПЛЕНКА ОТ:','ФАСАЫ FENIX'))
   or (category='Шкафы-купе' and item_name in ('INTEGRO Щеточный уплотнитель 12 мм','INTEGRO Уплотнитель 4+ мм'));
update public.furniture_estimate_catalog set unit='шт', updated_at=now()
where category='Облицовка и фасады' and item_name in ('ШПОН','КРОМКА AGT СУПРАМАТ ОТ:');
