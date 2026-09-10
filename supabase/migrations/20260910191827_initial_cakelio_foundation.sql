create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role, public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  primary_role text not null default 'customer' check (primary_role in ('customer','provider')),
  display_name text,
  avatar_path text,
  phone text,
  locale text not null default 'de-DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text unique,
  business_name text not null,
  bio text,
  city text,
  postal_code text,
  country_code text not null default 'DE' check (char_length(country_code) = 2),
  website text,
  instagram_handle text,
  delivery_radius_km integer check (delivery_radius_km is null or delivery_radius_km between 0 and 500),
  minimum_lead_days integer not null default 3 check (minimum_lead_days between 0 and 365),
  starting_price numeric(10,2) check (starting_price is null or starting_price >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  status text not null default 'draft' check (status in ('draft','pending_review','active','paused','suspended')),
  is_verified boolean not null default false,
  is_discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cake_options (
  category text not null,
  code text not null,
  label_en text not null,
  label_de text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  primary key (category, code),
  check (category in ('occasion','shape','size','sponge','filling','frosting','decoration','dietary'))
);

create table public.provider_capabilities (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  category text not null,
  code text not null,
  extra_price numeric(10,2) not null default 0 check (extra_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, category, code),
  foreign key (category, code) references public.cake_options(category, code) on update cascade
);

create table public.provider_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  image_path text not null,
  title text,
  description text,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.cake_designs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'My cake',
  config jsonb not null default '{}'::jsonb,
  preview_data jsonb not null default '{}'::jsonb,
  reference_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cake_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  cake_design_id uuid not null references public.cake_designs(id) on delete restrict,
  event_date date,
  fulfillment_type text not null default 'pickup' check (fulfillment_type in ('pickup','delivery')),
  delivery_city text,
  delivery_postal_code text,
  budget_min numeric(10,2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(10,2) check (budget_max is null or budget_max >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  notes text,
  status text not null default 'draft' check (status in ('draft','submitted','quoted','accepted','declined','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create table public.request_provider_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cake_requests(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','viewed','quoted','declined','closed')),
  created_at timestamptz not null default now(),
  unique (request_id, provider_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cake_requests(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, provider_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  attachment_path text,
  created_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cake_requests(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  total numeric(10,2) not null check (total >= 0),
  deposit_amount numeric(10,2) check (deposit_amount is null or deposit_amount >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  notes text,
  expires_at timestamptz,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.cake_requests(id) on delete restrict,
  quote_id uuid not null unique references public.quotes(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.provider_profiles(user_id) on delete restrict,
  status text not null default 'confirmed' check (status in ('confirmed','deposit_due','deposit_paid','in_progress','ready','completed','cancelled','refunded')),
  total numeric(10,2) not null check (total >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favourites (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, provider_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index provider_profiles_discovery_idx on public.provider_profiles(status, is_discoverable, city);
create index provider_capabilities_provider_idx on public.provider_capabilities(provider_id, category, is_active);
create index provider_portfolio_provider_idx on public.provider_portfolio_items(provider_id, sort_order);
create index cake_designs_customer_idx on public.cake_designs(customer_id, updated_at desc);
create index cake_requests_customer_idx on public.cake_requests(customer_id, created_at desc);
create index cake_requests_event_idx on public.cake_requests(event_date) where event_date is not null;
create index request_matches_provider_idx on public.request_provider_matches(provider_id, created_at desc);
create index conversations_customer_idx on public.conversations(customer_id, created_at desc);
create index conversations_provider_idx on public.conversations(provider_id, created_at desc);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index quotes_request_idx on public.quotes(request_id, created_at desc);
create index quotes_provider_idx on public.quotes(provider_id, created_at desc);
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_provider_idx on public.orders(provider_id, created_at desc);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, primary_role, display_name, locale)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'account_type' = 'provider' then 'provider' else 'customer' end,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'de-DE')
  );
  return new;
end;
$$;

create function private.guard_provider_review_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if tg_op = 'INSERT' and (new.status <> 'draft' or new.is_verified) then
      raise exception 'Provider verification fields are managed by Cakelio.';
    end if;
    if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.is_verified is distinct from old.is_verified) then
      raise exception 'Provider verification fields are managed by Cakelio.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.guard_provider_review_fields() from public, anon, authenticated;

create trigger profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger provider_profiles_updated_at before update on public.provider_profiles
for each row execute function private.set_updated_at();
create trigger provider_capabilities_updated_at before update on public.provider_capabilities
for each row execute function private.set_updated_at();
create trigger cake_designs_updated_at before update on public.cake_designs
for each row execute function private.set_updated_at();
create trigger cake_requests_updated_at before update on public.cake_requests
for each row execute function private.set_updated_at();
create trigger quotes_updated_at before update on public.quotes
for each row execute function private.set_updated_at();
create trigger orders_updated_at before update on public.orders
for each row execute function private.set_updated_at();
create trigger provider_review_guard before insert or update on public.provider_profiles
for each row execute function private.guard_provider_review_fields();
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.cake_options (category, code, label_en, label_de, sort_order) values
('occasion','birthday','Birthday','Geburtstag',10),
('occasion','wedding','Wedding','Hochzeit',20),
('occasion','anniversary','Anniversary','Jubiläum',30),
('occasion','baby_shower','Baby shower','Babyparty',40),
('occasion','other','Other','Sonstiges',90),
('shape','round','Round','Rund',10),
('shape','square','Square','Quadratisch',20),
('shape','heart','Heart','Herz',30),
('size','15cm','15 cm','15 cm',10),
('size','20cm','20 cm','20 cm',20),
('size','25cm','25 cm','25 cm',30),
('size','30cm','30 cm','30 cm',40),
('sponge','vanilla','Vanilla','Vanille',10),
('sponge','chocolate','Chocolate','Schokolade',20),
('sponge','red_velvet','Red velvet','Red Velvet',30),
('sponge','lemon','Lemon','Zitrone',40),
('filling','vanilla_cream','Vanilla cream','Vanillecreme',10),
('filling','chocolate_ganache','Chocolate ganache','Schokoladenganache',20),
('filling','strawberry','Strawberry','Erdbeere',30),
('filling','raspberry','Raspberry','Himbeere',40),
('frosting','buttercream','Buttercream','Buttercreme',10),
('frosting','ganache','Ganache','Ganache',20),
('frosting','fondant','Fondant','Fondant',30),
('decoration','flowers','Flowers','Blumen',10),
('decoration','fruit','Fruit','Obst',20),
('decoration','drip','Drip','Drip',30),
('decoration','topper','Topper','Cake Topper',40),
('decoration','sprinkles','Sprinkles','Streusel',50),
('dietary','vegan','Vegan','Vegan',10),
('dietary','gluten_free','Gluten-free','Glutenfrei',20),
('dietary','lactose_free','Lactose-free','Laktosefrei',30),
('dietary','nut_free','Nut-free','Nussfrei',40);

alter table public.profiles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.cake_options enable row level security;
alter table public.provider_capabilities enable row level security;
alter table public.provider_portfolio_items enable row level security;
alter table public.cake_designs enable row level security;
alter table public.cake_requests enable row level security;
alter table public.request_provider_matches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.quotes enable row level security;
alter table public.orders enable row level security;
alter table public.favourites enable row level security;
alter table public.notifications enable row level security;

revoke all on public.profiles, public.provider_profiles, public.cake_options, public.provider_capabilities, public.provider_portfolio_items, public.cake_designs, public.cake_requests, public.request_provider_matches, public.conversations, public.messages, public.quotes, public.orders, public.favourites, public.notifications from public, anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.provider_profiles to anon;
grant select, insert, update, delete on public.provider_profiles to authenticated;
grant select on public.cake_options to anon, authenticated;
grant select on public.provider_capabilities to anon;
grant select, insert, update, delete on public.provider_capabilities to authenticated;
grant select on public.provider_portfolio_items to anon;
grant select, insert, update, delete on public.provider_portfolio_items to authenticated;
grant select, insert, update, delete on public.cake_designs to authenticated;
grant select, insert, update, delete on public.cake_requests to authenticated;
grant select, insert, delete on public.request_provider_matches to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select on public.orders to authenticated;
grant select, insert, delete on public.favourites to authenticated;
grant select, update(read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.profiles, public.provider_profiles, public.cake_options, public.provider_capabilities, public.provider_portfolio_items, public.cake_designs, public.cake_requests, public.request_provider_matches, public.conversations, public.messages, public.quotes, public.orders, public.favourites, public.notifications to service_role;

create policy profiles_self_select on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_self_insert on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy profiles_self_update on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy provider_profiles_public_select on public.provider_profiles for select to anon, authenticated
using ((status = 'active' and is_discoverable) or (select auth.uid()) = user_id);
create policy provider_profiles_self_insert on public.provider_profiles for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'draft' and not is_verified);
create policy provider_profiles_self_update on public.provider_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy provider_profiles_self_delete on public.provider_profiles for delete to authenticated
using ((select auth.uid()) = user_id and status in ('draft','paused'));

create policy cake_options_public_select on public.cake_options for select to anon, authenticated
using (is_active = true);

create policy provider_capabilities_public_select on public.provider_capabilities for select to anon, authenticated
using (
  (select auth.uid()) = provider_id
  or exists (
    select 1 from public.provider_profiles pp
    where pp.user_id = provider_id and pp.status = 'active' and pp.is_discoverable
  )
);
create policy provider_capabilities_self_insert on public.provider_capabilities for insert to authenticated
with check ((select auth.uid()) = provider_id);
create policy provider_capabilities_self_update on public.provider_capabilities for update to authenticated
using ((select auth.uid()) = provider_id)
with check ((select auth.uid()) = provider_id);
create policy provider_capabilities_self_delete on public.provider_capabilities for delete to authenticated
using ((select auth.uid()) = provider_id);

create policy provider_portfolio_public_select on public.provider_portfolio_items for select to anon, authenticated
using (
  (select auth.uid()) = provider_id
  or (is_public and exists (
    select 1 from public.provider_profiles pp
    where pp.user_id = provider_id and pp.status = 'active' and pp.is_discoverable
  ))
);
create policy provider_portfolio_self_insert on public.provider_portfolio_items for insert to authenticated
with check ((select auth.uid()) = provider_id);
create policy provider_portfolio_self_update on public.provider_portfolio_items for update to authenticated
using ((select auth.uid()) = provider_id)
with check ((select auth.uid()) = provider_id);
create policy provider_portfolio_self_delete on public.provider_portfolio_items for delete to authenticated
using ((select auth.uid()) = provider_id);

create policy cake_designs_owner_select on public.cake_designs for select to authenticated
using ((select auth.uid()) = customer_id);
create policy cake_designs_owner_insert on public.cake_designs for insert to authenticated
with check ((select auth.uid()) = customer_id);
create policy cake_designs_owner_update on public.cake_designs for update to authenticated
using ((select auth.uid()) = customer_id)
with check ((select auth.uid()) = customer_id);
create policy cake_designs_owner_delete on public.cake_designs for delete to authenticated
using ((select auth.uid()) = customer_id);

create policy cake_requests_party_select on public.cake_requests for select to authenticated
using (
  (select auth.uid()) = customer_id
  or exists (
    select 1 from public.request_provider_matches rpm
    where rpm.request_id = id and rpm.provider_id = (select auth.uid())
  )
);
create policy cake_requests_owner_insert on public.cake_requests for insert to authenticated
with check (
  (select auth.uid()) = customer_id
  and exists (select 1 from public.cake_designs cd where cd.id = cake_design_id and cd.customer_id = (select auth.uid()))
);
create policy cake_requests_owner_update on public.cake_requests for update to authenticated
using ((select auth.uid()) = customer_id and status in ('draft','submitted'))
with check ((select auth.uid()) = customer_id and status in ('draft','submitted','cancelled'));
create policy cake_requests_owner_delete on public.cake_requests for delete to authenticated
using ((select auth.uid()) = customer_id and status = 'draft');

create policy request_matches_party_select on public.request_provider_matches for select to authenticated
using ((select auth.uid()) = customer_id or (select auth.uid()) = provider_id);
create policy request_matches_customer_insert on public.request_provider_matches for insert to authenticated
with check (
  (select auth.uid()) = customer_id
  and exists (select 1 from public.cake_requests cr where cr.id = request_id and cr.customer_id = (select auth.uid()) and cr.status in ('draft','submitted'))
  and exists (select 1 from public.provider_profiles pp where pp.user_id = provider_id and pp.status = 'active' and pp.is_discoverable)
);
create policy request_matches_customer_delete on public.request_provider_matches for delete to authenticated
using ((select auth.uid()) = customer_id);

create policy conversations_party_select on public.conversations for select to authenticated
using ((select auth.uid()) = customer_id or (select auth.uid()) = provider_id);
create policy conversations_customer_insert on public.conversations for insert to authenticated
with check (
  (select auth.uid()) = customer_id
  and exists (
    select 1 from public.request_provider_matches rpm
    where rpm.request_id = request_id and rpm.customer_id = customer_id and rpm.provider_id = provider_id
  )
);

create policy messages_party_select on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and ((select auth.uid()) = c.customer_id or (select auth.uid()) = c.provider_id)
  )
);
create policy messages_party_insert on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and ((select auth.uid()) = c.customer_id or (select auth.uid()) = c.provider_id)
  )
);

create policy quotes_party_select on public.quotes for select to authenticated
using ((select auth.uid()) = customer_id or (select auth.uid()) = provider_id);
create policy quotes_provider_insert on public.quotes for insert to authenticated
with check (
  (select auth.uid()) = provider_id
  and status in ('draft','sent','withdrawn')
  and exists (
    select 1 from public.request_provider_matches rpm
    where rpm.request_id = request_id and rpm.customer_id = customer_id and rpm.provider_id = (select auth.uid())
  )
);
create policy quotes_provider_update on public.quotes for update to authenticated
using ((select auth.uid()) = provider_id)
with check (
  (select auth.uid()) = provider_id
  and status in ('draft','sent','withdrawn')
  and exists (
    select 1 from public.request_provider_matches rpm
    where rpm.request_id = request_id and rpm.customer_id = customer_id and rpm.provider_id = (select auth.uid())
  )
);
create policy quotes_provider_delete on public.quotes for delete to authenticated
using ((select auth.uid()) = provider_id and status = 'draft');

create policy orders_party_select on public.orders for select to authenticated
using ((select auth.uid()) = customer_id or (select auth.uid()) = provider_id);

create policy favourites_owner_select on public.favourites for select to authenticated
using ((select auth.uid()) = customer_id);
create policy favourites_owner_insert on public.favourites for insert to authenticated
with check (
  (select auth.uid()) = customer_id
  and exists (select 1 from public.provider_profiles pp where pp.user_id = provider_id and pp.status = 'active' and pp.is_discoverable)
);
create policy favourites_owner_delete on public.favourites for delete to authenticated
using ((select auth.uid()) = customer_id);

create policy notifications_owner_select on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);
create policy notifications_owner_update on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('provider-portfolio', 'provider-portfolio', false, 15728640, array['image/jpeg','image/png','image/webp']),
  ('cake-references', 'cake-references', false, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy avatars_read on storage.objects for select to anon, authenticated
using (bucket_id = 'avatars');
create policy avatars_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);

create policy portfolio_read on storage.objects for select to anon, authenticated
using (
  bucket_id = 'provider-portfolio'
  and (
    owner_id = (select auth.uid())::text
    or exists (
      select 1 from public.provider_profiles pp
      where pp.user_id::text = (storage.foldername(name))[1]
        and pp.status = 'active' and pp.is_discoverable
    )
  )
);
create policy portfolio_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'provider-portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy portfolio_owner_update on storage.objects for update to authenticated
using (bucket_id = 'provider-portfolio' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'provider-portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy portfolio_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'provider-portfolio' and owner_id = (select auth.uid())::text);

create policy cake_references_owner_select on storage.objects for select to authenticated
using (bucket_id = 'cake-references' and owner_id = (select auth.uid())::text);
create policy cake_references_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'cake-references' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy cake_references_owner_update on storage.objects for update to authenticated
using (bucket_id = 'cake-references' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'cake-references' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy cake_references_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'cake-references' and owner_id = (select auth.uid())::text);
