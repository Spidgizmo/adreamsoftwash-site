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

Production must use a separate project, secret store, credentials, and explicit approval. Stripe, tax, GIS, email/SMS, real photo objects, automated entitlement issuance, production scheduling, production data, and deployment remain inactive/deferred. The paid-cycle and entitlement data foundation in this pull request remains test-only.

## Verification status — 2026-08-02

GitHub Actions verified the complete disposable environment on commit `e55b5f5fd878f29cb928f3b1b572619d5b9fbf48`: `npm test` passed 42/42, typecheck passed, lint passed with two pre-existing image warnings, build passed, `supabase db reset` passed, `supabase db lint --local` reported no schema errors, and `supabase test db` passed 90/90 assertions across seven files. The workflow also provisioned all six fictional passwords, signed in every customer/staff test identity through Supabase Auth, and verified the expected customer-row visibility through the live REST/RLS boundary. This verifies the disposable test foundation only; it does not activate or verify a production project.
