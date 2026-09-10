alter table public.profiles
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists country_code text not null default 'DE' check (char_length(country_code) = 2);

alter table public.provider_profiles
  add column if not exists accepting_orders boolean not null default true;

create table if not exists public.provider_availability (
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  available_date date not null,
  status text not null default 'available' check (status in ('available','unavailable','booked')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (provider_id, available_date)
);

create index if not exists provider_availability_date_idx
  on public.provider_availability(available_date, status);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.provider_profiles(user_id) on delete restrict,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  payment_kind text not null default 'full' check (payment_kind in ('deposit','balance','full')),
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments(order_id, created_at desc);
create index if not exists payments_customer_idx on public.payments(customer_id, created_at desc);
create index if not exists payments_provider_idx on public.payments(provider_id, created_at desc);

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partially_paid','paid','refunded')),
  add column if not exists amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

create or replace function private.guard_provider_review_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if tg_op = 'INSERT' and new.is_verified then
      raise exception 'Provider verification is managed by Cakelio.';
    end if;
    if tg_op = 'UPDATE' and new.is_verified is distinct from old.is_verified then
      raise exception 'Provider verification is managed by Cakelio.';
    end if;
    if new.status = 'suspended' then
      raise exception 'Suspension status is managed by Cakelio.';
    end if;
  end if;
  return new;
end;
$$;

create trigger provider_availability_updated_at before update on public.provider_availability
for each row execute function private.set_updated_at();
create trigger payments_updated_at before update on public.payments
for each row execute function private.set_updated_at();

alter table public.provider_availability enable row level security;
alter table public.payments enable row level security;

revoke all on public.provider_availability, public.payments from public, anon, authenticated;
grant select on public.provider_availability to anon, authenticated;
grant insert, update, delete on public.provider_availability to authenticated;
grant select on public.payments to authenticated;
grant all on public.payments to service_role;

drop policy if exists provider_availability_public_read on public.provider_availability;
create policy provider_availability_public_read on public.provider_availability
for select to anon, authenticated
using (
  provider_id = (select auth.uid())
  or exists (
    select 1 from public.provider_profiles pp
    where pp.user_id = provider_id
      and pp.status = 'active'
      and pp.is_discoverable = true
  )
);

drop policy if exists provider_availability_owner_write on public.provider_availability;
create policy provider_availability_owner_write on public.provider_availability
for all to authenticated
using (provider_id = (select auth.uid()))
with check (provider_id = (select auth.uid()));

drop policy if exists payments_participant_read on public.payments;
create policy payments_participant_read on public.payments
for select to authenticated
using (customer_id = (select auth.uid()) or provider_id = (select auth.uid()));

create or replace function public.submit_order_request(
  p_provider_id uuid,
  p_design_name text,
  p_design_config jsonb,
  p_event_date date,
  p_fulfillment_type text default 'pickup',
  p_delivery_city text default null,
  p_delivery_postal_code text default null,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_provider public.provider_profiles%rowtype;
  v_design_id uuid;
  v_request_id uuid;
  v_conversation_id uuid;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if p_event_date is null then raise exception 'Event date is required.'; end if;
  if p_fulfillment_type not in ('pickup','delivery') then raise exception 'Invalid fulfillment type.'; end if;
  if p_budget_min is not null and p_budget_max is not null and p_budget_max < p_budget_min then raise exception 'Maximum budget must be at least the minimum budget.'; end if;

  select * into v_provider
  from public.provider_profiles
  where user_id = p_provider_id
    and status = 'active'
    and is_discoverable = true
    and accepting_orders = true;

  if not found then raise exception 'This baker is not accepting marketplace orders.'; end if;
  if p_event_date < current_date + v_provider.minimum_lead_days then
    raise exception 'This date is inside the baker''s minimum lead time.';
  end if;
  if exists (
    select 1 from public.provider_availability pa
    where pa.provider_id = p_provider_id
      and pa.available_date = p_event_date
      and pa.status in ('unavailable','booked')
  ) then raise exception 'This baker is unavailable on the selected date.'; end if;

  insert into public.cake_designs(customer_id, name, config)
  values (v_user, coalesce(nullif(trim(p_design_name),''),'Custom cake'), coalesce(p_design_config,'{}'::jsonb))
  returning id into v_design_id;

  insert into public.cake_requests(
    customer_id, cake_design_id, event_date, fulfillment_type,
    delivery_city, delivery_postal_code, budget_min, budget_max, notes, status
  ) values (
    v_user, v_design_id, p_event_date, p_fulfillment_type,
    nullif(trim(coalesce(p_delivery_city,'')),''), nullif(trim(coalesce(p_delivery_postal_code,'')),''),
    p_budget_min, p_budget_max, nullif(trim(coalesce(p_notes,'')),''), 'submitted'
  ) returning id into v_request_id;

  insert into public.request_provider_matches(request_id, customer_id, provider_id, status)
  values (v_request_id, v_user, p_provider_id, 'invited');

  insert into public.conversations(request_id, customer_id, provider_id)
  values (v_request_id, v_user, p_provider_id)
  returning id into v_conversation_id;

  if nullif(trim(coalesce(p_notes,'')),'') is not null then
    insert into public.messages(conversation_id, sender_id, body)
    values (v_conversation_id, v_user, trim(p_notes));
  end if;

  insert into public.notifications(user_id, kind, title, body, link)
  values (p_provider_id, 'new_request', 'New cake request', 'A customer sent you a new cake request.', '/account?section=orders');

  return jsonb_build_object('request_id', v_request_id, 'conversation_id', v_conversation_id, 'design_id', v_design_id);
end;
$$;

create or replace function public.send_quote(
  p_request_id uuid,
  p_subtotal numeric,
  p_delivery_fee numeric default 0,
  p_discount numeric default 0,
  p_deposit_amount numeric default null,
  p_notes text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider uuid := (select auth.uid());
  v_request public.cake_requests%rowtype;
  v_total numeric(10,2);
  v_quote_id uuid;
begin
  if v_provider is null then raise exception 'Authentication required.'; end if;
  if p_subtotal is null or p_subtotal < 0 then raise exception 'Subtotal must be zero or more.'; end if;
  if coalesce(p_delivery_fee,0) < 0 or coalesce(p_discount,0) < 0 then raise exception 'Fees and discounts cannot be negative.'; end if;

  select * into v_request from public.cake_requests where id = p_request_id;
  if not found then raise exception 'Request not found.'; end if;

  if not exists (
    select 1 from public.request_provider_matches rpm
    where rpm.request_id = p_request_id and rpm.provider_id = v_provider and rpm.status <> 'closed'
  ) then raise exception 'You are not assigned to this request.'; end if;

  v_total := greatest(0, p_subtotal + coalesce(p_delivery_fee,0) - coalesce(p_discount,0));
  if p_deposit_amount is not null and (p_deposit_amount < 0 or p_deposit_amount > v_total) then
    raise exception 'Deposit must be between zero and the quote total.';
  end if;

  insert into public.quotes(
    request_id, customer_id, provider_id, subtotal, delivery_fee, discount,
    total, deposit_amount, currency, notes, expires_at, status
  ) values (
    p_request_id, v_request.customer_id, v_provider, p_subtotal, coalesce(p_delivery_fee,0), coalesce(p_discount,0),
    v_total, p_deposit_amount, v_request.currency, nullif(trim(coalesce(p_notes,'')),''), p_expires_at, 'sent'
  ) returning id into v_quote_id;

  update public.cake_requests set status = 'quoted' where id = p_request_id;
  update public.request_provider_matches set status = 'quoted' where request_id = p_request_id and provider_id = v_provider;

  insert into public.notifications(user_id, kind, title, body, link)
  values (v_request.customer_id, 'quote_received', 'New quote received', 'A baker sent a quote for your cake.', '/account?section=orders');

  return v_quote_id;
end;
$$;

create or replace function public.accept_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_quote public.quotes%rowtype;
  v_order_id uuid;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;

  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then raise exception 'Quote not found.'; end if;
  if v_quote.customer_id <> v_user then raise exception 'This quote does not belong to you.'; end if;
  if v_quote.status <> 'sent' then raise exception 'This quote can no longer be accepted.'; end if;
  if v_quote.expires_at is not null and v_quote.expires_at < now() then raise exception 'This quote has expired.'; end if;

  select id into v_order_id from public.orders where request_id = v_quote.request_id;
  if v_order_id is not null then return v_order_id; end if;

  update public.quotes set status = 'accepted' where id = p_quote_id;
  update public.quotes set status = 'withdrawn' where request_id = v_quote.request_id and id <> p_quote_id and status = 'sent';
  update public.cake_requests set status = 'accepted' where id = v_quote.request_id;
  update public.request_provider_matches set status = 'closed' where request_id = v_quote.request_id;

  insert into public.orders(request_id, quote_id, customer_id, provider_id, status, total, currency)
  values (
    v_quote.request_id, v_quote.id, v_quote.customer_id, v_quote.provider_id,
    case when coalesce(v_quote.deposit_amount,0) > 0 then 'deposit_due' else 'confirmed' end,
    v_quote.total, v_quote.currency
  ) returning id into v_order_id;

  insert into public.notifications(user_id, kind, title, body, link)
  values (v_quote.provider_id, 'quote_accepted', 'Quote accepted', 'The customer accepted your quote. The order is now confirmed.', '/account?section=orders');

  return v_order_id;
end;
$$;

revoke all on function public.submit_order_request(uuid,text,jsonb,date,text,text,text,numeric,numeric,text) from public, anon;
revoke all on function public.send_quote(uuid,numeric,numeric,numeric,numeric,text,timestamptz) from public, anon;
revoke all on function public.accept_quote(uuid) from public, anon;
grant execute on function public.submit_order_request(uuid,text,jsonb,date,text,text,text,numeric,numeric,text) to authenticated;
grant execute on function public.send_quote(uuid,numeric,numeric,numeric,numeric,text,timestamptz) to authenticated;
grant execute on function public.accept_quote(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
