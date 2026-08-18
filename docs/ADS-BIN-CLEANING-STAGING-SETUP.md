# ADS Bin Cleaning hosted staging setup

**Launch checklist:** Step 2  
**Owner:** James Gibbs  
**Purpose:** put the existing fictional ADS Bin Cleaning foundation online for safe phone and computer testing without real customers or real payments.

## Safety boundary

- Staging is a separate hosted Supabase project and a separate hosted web deployment.
- Staging contains fictional test records only.
- `NEXT_PUBLIC_APP_ENV=staging` displays a permanent banner: **staging test site — fictional data only — no real payments**.
- Stripe is not required for Step 2 and must remain disconnected.
- When Stripe is added in Step 8, it will use a Stripe testing environment and test payment values, not a real card or real money.
- Never place `SUPABASE_SERVICE_ROLE_KEY`, database passwords, staging user passwords, or future Stripe secret keys in browser variables or committed files.

## Repository preparation completed

- Hosted-environment validation rejects localhost and non-HTTPS Supabase URLs.
- `/api/bin-cleaning/staging-health` reports only redacted staging health information and never returns keys.
- A staging safety banner is rendered when `NEXT_PUBLIC_APP_ENV=staging`.
- `staging-supabase-publish.yml` can link a dedicated hosted Supabase project, preview/apply migrations, optionally load the fictional seed, provision six fictional Auth identities, and verify hosted RLS isolation.
- `staging-smoke-verification.yml` verifies the hosted website, safety banner, Supabase reachability, six fictional sign-ins, and role-scoped customer visibility.
- `npm run test:staging:verify` provides the same final hosted smoke test outside GitHub Actions.

## One-time hosted services required

### 1. Dedicated Supabase staging project

Create a new Supabase project used only for ADS Bin Cleaning staging. Do not reuse a future production project.

Record these values in the protected GitHub environment named `ads-bin-cleaning-staging`:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_STAGING_PROJECT_REF`
- `SUPABASE_STAGING_DB_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADS_STAGING_TEST_PASSWORD` — a unique password of at least 16 characters used only by the six fictional staging identities

Run **Publish ADS Bin Cleaning staging database** with `include_fictional_seed=true` for the first hosted load. Use `false` on later migration-only runs unless the staging project has been intentionally emptied.

### 2. Hosted Next.js staging deployment

Connect `Spidgizmo/adreamsoftwash-site` to a hosted Next.js deployment and deploy the branch:

`codex/begin-agent-2-for-ads-bin-cleaning`

Set these variables for the staging/preview deployment:

- `NEXT_PUBLIC_APP_ENV=staging`
- `NEXT_PUBLIC_SUPABASE_URL` — hosted staging project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — hosted staging anon key
- `APP_BASE_URL` — the final HTTPS staging URL, when known

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` or the fictional user password in the web deployment. The current web application does not need either value to display the test portal/CRM through normal authenticated RLS access.

After deployment, confirm:

- the yellow staging safety banner is visible;
- `/api/bin-cleaning/staging-health` returns HTTP 200 and `ok: true`;
- `/bin-cleaning` and `/bin-cleaning/login` load on phone and computer.

### 3. Final smoke-test secret

Add the hosted website URL to the same protected GitHub environment as:

- `STAGING_APP_URL`

Run **Verify ADS Bin Cleaning hosted staging**.

## Fictional staging identities

The publish workflow provisions one protected password for these fictional accounts:

- `avery@example.test` — customer
- `jordan@example.test` — second customer used for isolation testing
- `admin@example.test` — administrator
- `dispatcher@example.test` — dispatcher
- `technician@example.test` — assigned technician
- `unassigned-tech@example.test` — technician with no assigned customer visibility

The password must stay in the protected secret store. It must not be written in documentation, chat, source code, or public deployment variables.

## Step 2 acceptance test

Step 2 is **DONE** only after all of the following pass:

1. The hosted staging website opens over HTTPS on both a phone and computer.
2. The staging banner clearly says fictional data and no real payments.
3. The health endpoint confirms a hosted, reachable Supabase staging project.
4. All migrations and fictional seed records exist in hosted Supabase.
5. All six fictional identities can authenticate.
6. Customer/staff RLS isolation matches the expected test roles.
7. James signs into at least one fictional customer and one fictional staff account from the hosted website.
8. No live Stripe key, real card, real customer, or production database is used.

Until the hosted Supabase project and hosted Next.js deployment are connected, Step 2 remains **IN PROGRESS — awaiting hosted account configuration**.
