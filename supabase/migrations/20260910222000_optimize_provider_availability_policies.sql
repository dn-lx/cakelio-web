-- Avoid duplicate permissive SELECT policies on provider_availability.
-- Public/participant reads remain in one SELECT policy; only the provider can write.

drop policy if exists provider_availability_owner_write on public.provider_availability;

drop policy if exists provider_availability_owner_insert on public.provider_availability;
create policy provider_availability_owner_insert
on public.provider_availability
for insert to authenticated
with check (provider_id = (select auth.uid()));

drop policy if exists provider_availability_owner_update on public.provider_availability;
create policy provider_availability_owner_update
on public.provider_availability
for update to authenticated
using (provider_id = (select auth.uid()))
with check (provider_id = (select auth.uid()));

drop policy if exists provider_availability_owner_delete on public.provider_availability;
create policy provider_availability_owner_delete
on public.provider_availability
for delete to authenticated
using (provider_id = (select auth.uid()));

comment on function public.submit_order_request(uuid,text,jsonb,date,text,text,text,numeric,numeric,text)
is 'Intentional SECURITY DEFINER transaction boundary. Callable only by authenticated users and validates auth.uid(), baker status, lead time, availability and ownership before writes.';
comment on function public.send_quote(uuid,numeric,numeric,numeric,numeric,text,timestamptz)
is 'Intentional SECURITY DEFINER transaction boundary. Callable only by authenticated users and validates auth.uid() against an assigned provider match before writes.';
comment on function public.accept_quote(uuid)
is 'Intentional SECURITY DEFINER transaction boundary. Callable only by authenticated users and validates auth.uid() as the quote customer before creating an order.';
