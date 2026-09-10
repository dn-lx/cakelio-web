# Cakelio Supabase

This directory tracks the database migrations applied to the dedicated **Cakelio** Supabase project.

- Project ref: `wbqnctrvxohxwiaignhg`
- Region: `eu-central-1`
- Separate from the FrankiFlow & FrankiHolz backend by design.

## Migration history

1. `20260910191827_initial_cakelio_foundation.sql`
2. `20260910191906_add_missing_foreign_key_indexes.sql`

The foundation creates Cakelio profiles, provider data, Cake Studio option catalog, saved designs, requests, matching, conversations/messages, quotes, orders, favourites and notifications, plus Storage buckets and Row Level Security policies.

## Security rules

- Never commit Supabase secret/service-role keys.
- Browser and Expo clients use only the Cakelio publishable key through environment variables.
- Every public-schema application table has RLS enabled.
- Provider verification and activation are not client-controlled.
- Run Supabase security/performance advisors after schema changes.
