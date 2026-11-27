-- Исправление прав на удаление заказов в CRM «Мастер мебельщик».
-- Выполнить один раз в Supabase → SQL Editor → New query → Run.
-- Удаление истории выполняется автоматически через ON DELETE CASCADE.

grant usage on schema public to authenticated;
grant delete on table public.furniture_orders to authenticated;

drop policy if exists "authenticated users can delete furniture orders" on public.furniture_orders;
create policy "authenticated users can delete furniture orders"
on public.furniture_orders
for delete
to authenticated
using (true);
