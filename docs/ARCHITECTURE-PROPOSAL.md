# ADS Bin Cleaning connected architecture proposal

## Recommendation

Extend the existing Next.js App Router and Tailwind CSS application as one responsive product. Use Supabase Postgres as the shared system of record, Supabase Auth for customer/staff/admin identities, Row Level Security (RLS), server-side role authorization, Stripe Checkout and Billing in test mode, Stripe webhooks, the Stripe customer billing portal, and Stripe Tax behind a replaceable `TaxProvider` boundary.

The public page, self-signup, staff-assisted signup, customer portal, CRM, billing/tax adapters, promotions, entitlements, and future routing are modules over the same database—not separately owned applications or synchronized customer copies. Lavo remains isolated and unchanged.

## Logical layers and flows

1. **Responsive Next.js surfaces:** public pricing/signup, customer portal, staff/admin CRM, and future field views reuse the existing Tailwind design system and work across phone, tablet, laptop, desktop, portrait, and landscape.
2. **Server application services:** catalog/pricing, promotion eligibility/redemption, identity onboarding, customer/lead, address validation, tax-provider adapter, checkout, billing webhook, referral ledger, entitlement, scheduling, route, notification, and audit services enforce shared rules.
3. **Supabase:** Postgres holds canonical records; Auth supplies identity; RLS restricts customers to their rows while staff/admin access is role-scoped. Privileged actions also check authorization server-side.
4. **Stripe test integrations:** server-created Checkout/payment links and subscriptions reference catalog-approved Stripe IDs and trusted promotion decisions. Signed, idempotent webhooks update local billing/status records and create entitlements. The billing portal handles payment methods without exposing card data.
5. **Tax provider abstraction:** a narrow interface accepts validated address, product classification, line items, discounts, and transaction context and returns jurisdictions/rate/totals/provider ID. Stripe Tax is the initial adapter, but domain/CRM code consumes only the interface.

Public signup first creates an Auth identity, provisional customer, signup snapshot, unique customer ID, and pending-payment CRM record in the shared store, then requests promotion validation, tax, and Stripe Checkout. Staff signup calls the same services and sends a secure payment link. Webhooks, not browser redirects, authoritatively transition payment and service state.

## Central versioned service-plan catalog

`src/lib/bin-cleaning-catalog.json` is the single reviewed catalog definition. It supplies the typed application catalog and generates the immutable/effective-dated `service_plans` and `service_plan_versions` seed snapshot; an automated check rejects divergence. The resulting versioned database records are referenced by signup, subscriptions, portal, CRM, tax, entitlements, routing, invoices, and reporting. A version stores internal ID, display name/description, active state, charge type, billing unit/quantity, service unit/quantity, first-bin/additional-bin prices, included bins, referral eligibility, tax classification, Stripe product/price references, and effective date.

The launch configuration exposes Monthly, Quarterly, Twice a Year, and One-Time Cleaning with their approved catalog pricing. Every 2 Weeks may exist only as future/inactive with no price, Stripe Price, staff/public visibility, or referral eligibility. Activating a future approved version is a catalog/configuration change, not a website, portal, CRM, tax, entitlement, or routing rebuild.

Pricing is calculated server-side from catalog version plus bin count; clients render the returned breakdown. Persist the selected version and base/additional/subtotal/discount/tax/total snapshots on signup, invoice, payment, entitlement, and history records.

## Central promotion policy

NEW25 is represented once as an active promotion rule rather than duplicated in signup copy, Stripe configuration, CRM, invoices, or reporting. Its current approved rule is: new Monthly subscriber only, 25% off the first paid Monthly cycle, and no discount on later cycles. The browser may normalize and preview the code, but it cannot establish eligibility or author the final cents.

The trusted checkout service must normalize the submitted code, load the active promotion policy, confirm the selected plan/version is Monthly, confirm the customer/account has no disqualifying prior Monthly subscription under the final approved new-subscriber definition, calculate the discount from the trusted first-cycle subtotal, and create Stripe Checkout with the matching test-mode coupon/promotion configuration. It must persist an idempotent redemption/attempt record tied to customer, signup, subscription, plan version, invoice/payment cycle, normalized code, discount basis, discount cents, status, and timestamps.

Marketing links may carry `promo=NEW25`, but the server always revalidates the value. Unknown, inactive, expired, or ineligible codes fail closed. The unresolved stacking rule with **Share 50%. Get 50%.** must be stored as a release-blocking owner decision rather than inferred by client or Stripe configuration.

## Proposed data domains

- **Identity/access:** auth user mapping, customer/staff/admin profile, roles/permissions, login status, recovery/audit events.
- **Customer/lead:** customer ID, contact/address validation, source, signup status, trash/recycling declarations, return/access instructions, consent and activity.
- **Catalog/history:** plans, versions, Stripe references, tax class, referral eligibility, plan-change requests and audit.
- **Promotions:** normalized codes, active/effective state, eligible plan/version scope, first-cycle/new-subscriber rules, percentage/fixed discount basis, stacking policy reference, Stripe test references, redemption attempts, successful applications, reversals, and audit history.
- **Billing/tax:** Stripe customer/subscription/checkout/invoice/payment references; separate payment/subscription states; calculation snapshots containing validated address/status, jurisdictions, rate, pre-discount subtotal, discount lines, taxable subtotal, tax, total, classification, provider ID, timestamp.
- **Service:** separate service status; pickup source values, holiday dates, calculated cleaning date, verification/review; service history.
- **Entitlements:** one idempotently created entitlement per successful paid cycle, lifecycle status, source invoice/payment, cycle boundaries, and a uniqueness rule preventing more than one completion.
- **Routing/field:** zones, multiple zone runs, capacity, stops/order, route status, evidence/photos, return confirmation/exceptions, surcharge review, notifications, staff/equipment logs.
- **Referral ledger:** permanent codes, attribution, qualification hold/events, expiring credit entries, applications and reversals.

Keep login, signup, payment, subscription, service, entitlement, and route states as separate columns/state histories. Use database constraints, idempotency keys, immutable financial snapshots, timestamps, reason codes, and actor audit records.

## Security and privacy

- Default-deny RLS: customers read/update only permitted fields on their own records; staff/admin policies are role-specific. Service-role access stays server-side.
- Recheck staff/admin roles on every privileged server operation. Log sensitive actions and status changes.
- Verify Stripe webhook signatures, enforce idempotency, and reject client-authored price, promotion, discount, tax, or status values.
- Store Stripe references/tokens only—never full card number, CVC/security code, or raw card data in database, notes, repository, or logs.
- Validate and normalize addresses while preserving original/customer, official, holiday, and staff-approved values separately.
- Keep secrets out of source control and expose only intentionally public browser configuration.

## Payment, entitlement, and routing behavior

A successful Stripe event creates exactly one entitlement for its monthly, three-month, six-month, or one-time paid cycle. Zone runs may occur multiple times monthly, but assignment consumes no additional entitlement. A unique completion constraint prevents duplicate fulfilled cleanings.

A failed recurring payment immediately holds service and its active stop while preserving login. Store failure and seven-calendar-day deadline. Unpaid after the deadline becomes suspended; payment recovery reactivates and queues the entitlement for the next eligible zone run without changing billing anniversary or creating a special trip. Model state transitions as auditable, idempotent jobs/webhook reactions.

## Environment variable names (blank examples only)

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID=
APP_BASE_URL=
ADDRESS_VALIDATION_PROVIDER_KEY=
```

Provider-specific identifiers—including Stripe coupon and promotion-code IDs—belong in protected configuration or reviewed catalog/promotion records, not duplicated client code. No real values are authorized in planning.

## Delivery constraints

This proposal installs no packages, creates no Supabase project, creates no Stripe products/prices/coupons, supplies no credentials, and adds no live integration. Stripe remains test-only. Live signup waits for connected account, portal, test billing, and minimum CRM behavior. See the roadmap for staged implementation and the decision log for approval gates.

The public service description may use the owner-approved standard-service scope recorded in the MVP and decision log. The exterior-cleaning Lavo link remains a clearly labeled global-header option on bin-cleaning routes, but no bin-cleaning signup, account, billing, CRM, or scheduling flow uses Lavo.

## Agent 2 test foundation (2026-08-02)

The committed Supabase CLI configuration, migration, seed, RLS helpers/policies, and database completion trigger implement the test foundation without dashboard dependencies. Responsive test surfaces now exist at `/bin-cleaning/login`, `/bin-cleaning/portal`, `/bin-cleaning/crm`, `/bin-cleaning/crm/customers/[id]`, `/bin-cleaning/crm/visits`, and `/bin-cleaning/field/visits/[id]`. They are now session-scoped to fictional records in the disposable Supabase database; they do not activate production signup, billing, messaging, scheduling, storage delivery, or deployment.

Local/test and future production projects must be separate Supabase projects with separately scoped credentials. `.env.local` contains only local/test values; deployment-secret storage will later contain production values after explicit approval. Never copy test service-role keys into browser variables or reuse a production project for tests.

### Agent 2 correction: authenticated runtime

Private routes are guarded by Next.js middleware which validates the HTTP-only Supabase access-token cookie against Auth, resolves the role through session-scoped PostgREST/RLS, and redirects missing/expired/wrong-role sessions. Server components and route handlers use the same access token and anon key; the service-role key is never sent to the browser. Runtime portal, CRM, customer, visit, and field data now come from PostgREST rather than fixtures. Customer route-affecting edits create `customer_change_requests`; field mutations and protected-table triggers persist audit history.

### Paid-cycle entitlement foundation

`paid_service_cycles` represents a subscription/plan-version cycle and carries a unique idempotency key. Each cycle can create at most one `cleaning_entitlement`, which has its own unique idempotency key and approved lifecycle status. Visits reference the entitlement, and a partial unique index prevents more than one completed visit per entitlement. Stripe/webhook creation remains deferred, but it must use these keys rather than creating duplicate service rights. Audit events store both a UUID `entity_id` when applicable and a text-safe `entity_key` for catalog IDs such as `monthly`.

### NEW25 signup-preview foundation

The signup preview consumes the centralized NEW25 policy, accepts typed or marketing-link input, and calculates the first-month estimate without trusting the browser for future checkout. No Stripe coupon, live redemption, customer-history eligibility check, or stacking decision is activated by this preview work.
