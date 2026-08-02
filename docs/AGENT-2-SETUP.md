# Agent 2 local and disposable-test setup

Install Node.js 20+, npm, Docker, and Supabase CLI. Copy `.env.example` to `.env.local` and use only a disposable local/test project. Never expose `SUPABASE_SERVICE_ROLE_KEY` through `NEXT_PUBLIC_*`.

1. `npm ci`
2. `supabase start`
3. `supabase db reset`
4. Copy local URL, anon key, and server-only service key from `supabase status`.
5. Generate a unique 16+ character disposable password in your shell as `ADS_TEST_USER_PASSWORD`; do not write it to a file, chat, commit, or shared production-like secret.
6. `npm run test:auth:provision` updates only the six fictional local Auth identities created with random unusable seed hashes.
7. `npm run dev`

Verify customer (`avery@example.test`), second isolation customer (`jordan@example.test`), administrator, dispatcher, assigned technician, and unassigned technician using the locally supplied disposable password. Delete the local database and unset the password afterward.

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `supabase db reset`, `supabase db lint --local`, and `supabase test db`. Database security is verified only when the final three commands execute against PostgreSQL; Node source-contract tests are not a substitute.

Production must use a separate project, secret store, credentials, and explicit approval. Stripe, tax, GIS, email/SMS, real photo objects, entitlements, production scheduling, production data, and deployment remain inactive/deferred.

## Verification status — 2026-08-02

The application checks executed in this environment: `npm test` passed 42/42, `npm run typecheck` passed, `npm run lint` passed with two pre-existing image warnings, and `npm run build` passed. Database verification remains outstanding: `supabase db reset`, `supabase db lint --local`, and `supabase test db` each exited 127 because the Supabase CLI is absent. Safe CLI/PostgreSQL installation attempts were blocked by the environment proxy with HTTP 403, and Docker/Podman/PostgreSQL are not preinstalled. Do not describe the migrations, seed, RLS, or pgTAP tests as executed until those commands pass in a disposable Supabase environment.
