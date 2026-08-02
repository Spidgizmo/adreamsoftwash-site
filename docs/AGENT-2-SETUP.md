# Agent 2 local and test setup

## Requirements and environment

Install Node.js 20+, npm, Docker, and the Supabase CLI. Copy `.env.example` to `.env.local`; populate only a disposable local/test project's URL and anon key. `SUPABASE_SERVICE_ROLE_KEY` is optional for server test tooling and must never use the `NEXT_PUBLIC_` prefix.

## Local workflow

1. `npm ci`
2. `supabase start`
3. `supabase db reset` (applies `supabase/migrations` then `supabase/seed.sql`)
4. Copy local values printed by `supabase status` into `.env.local`.
5. `npm run dev`

For a hosted **test** project, link only its test project ref, run `supabase db push --dry-run`, review, then `supabase db push`. Reset/seed only disposable test databases. Production must use a distinct Supabase organization/project, deployment environment, secret store, restricted keys, and explicit owner approval; production credentials must never exist in local test files.

## Test procedure

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `supabase db lint --local`, and database policy tests after `supabase db reset`. The Node security contract checks policy presence without replacing live PostgreSQL RLS tests. Test the portal, CRM, and field navigation at 375, 768, 1024, and 1440 CSS pixels.

## Limits

Agent 2 does not configure live signup, real password recovery, Stripe, tax, GIS/address verification, email/SMS, production scheduling/deployment/data, real storage uploads, or real customer records. UI form submissions are inert test foundations; server mutations and authenticated data adapters are Agent 3 work.
