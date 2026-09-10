# Cakelio Web

Main customer and baker web application for **Cakelio** — a custom-cake marketplace and cake design studio.

## Stack
- Next.js 16.3.3 / React 19.2 / TypeScript
- Supabase Auth + Postgres + Storage
- `@supabase/ssr` cookie-based server/browser clients
- Netlify deployment

## Supabase
Cakelio uses its own project (`wbqnctrvxohxwiaignhg`, EU Central). It is intentionally separate from every FrankiFlow/FrankiHolz backend.

Create `.env.local` from `.env.example` and set the Cakelio **publishable** key. Never add secret/service-role keys to browser environment variables or source control.

## Development
```bash
npm install
npm run dev
```

## Current status
- Public marketplace shell and interactive Cake Studio
- Customer/provider email + password signup/signin
- SSR session refresh and protected `/account` route
- Cakelio database foundation with RLS and Storage buckets

Next: provider onboarding, persistent Cake Studio designs and database-backed baker discovery.
