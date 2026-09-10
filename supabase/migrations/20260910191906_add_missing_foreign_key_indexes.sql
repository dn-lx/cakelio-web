create index cake_requests_design_idx on public.cake_requests(cake_design_id);
create index favourites_provider_idx on public.favourites(provider_id);
create index messages_sender_idx on public.messages(sender_id);
create index provider_capabilities_option_idx on public.provider_capabilities(category, code);
create index quotes_customer_idx on public.quotes(customer_id, created_at desc);
create index request_matches_customer_idx on public.request_provider_matches(customer_id, created_at desc);
