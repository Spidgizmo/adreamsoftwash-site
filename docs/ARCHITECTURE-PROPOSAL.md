# ADS Bin Cleaning connected architecture proposal

## Recommendation

Extend the existing Next.js App Router and Tailwind CSS application as one responsive product. Use Supabase Postgres as the shared system of record, Supabase Auth for customer/staff/admin identities, Row Level Security (RLS), server-side role authorization, Stripe Checkout and Billing in test mode, Stripe webhooks, the Stripe customer billing portal, and Stripe Tax behind a replaceable `TaxProvider` boundary.

The public page, self-signup, staff-assisted signup, customer portal, CRM, billing/tax adapters, entitlements, and future routing are modules over the same database—not separately owned applications or synchronized customer copies. Lavo remains isolated and unchanged.

## Logical layers and flows

1. **Responsive Next.js surfaces:** public pricing/signup, customer portal, staff/admin CRM, and future field views reuse the existing Tailwind design system and work across phone, tablet, laptop, desktop, portrait, and landscape.
2. **Server application services:** catalog/pricing, identity onboarding, customer/lead, address validation, tax-provider adapter, checkout, billing webhook, referral ledger, entitlement, scheduling, route, notification, and audit services enforce shared rules.
3. **Supabase:** Postgres holds canonical records; Auth supplies identity; RLS restricts customers to their rows while staff/admin access is role-scoped. Privileged actions also check authorization server-side.
4. **Stripe test integrations:** server-created Checkout/payment links and subscriptions reference catalog-approved Stripe IDs. Signed, idempotent webhooks update local billing/status records and create entitlements. The billing portal handles payment methods without exposing card data.
5. **Tax provider abstraction:** a narrow interface accepts validated address, product classification, line items, and transaction context and returns jurisdictions/rate/totals/provider ID. Stripe Tax is the initial adapter, but domain/CRM code consumes only the interface.

Public signup first creates an Auth identity, provisional customer, signup snapshot, unique customer ID, and pending-payment CRM record in the shared store, then requests tax and Stripe Checkout. Staff signup calls the same services and sends a secure payment link. Webhooks, not browser redirects, authoritatively transition payment and service state.

## Central versioned service-plan catalog

`service_plans` and immutable/effective-dated `service_plan_versions` are the only pricing/eligibility source for public pricing, both signup paths, Checkout/subscriptions, portal, CRM, tax, entitlements, routing, invoices, and reporting. A version stores internal ID, display name/description, active state, charge type, billing unit/quantity, service unit/quantity, first-bin/additional-bin prices, included bins, referral eligibility, tax classification, Stripe product/price references, and effective date.

The launch configuration exposes Monthly, Quarterly, Twice a Year, and One-Time Cleaning. Twice-a-Year checkout cannot activate until its approved price/version exists. Every 2 Weeks may exist only as future/inactive with no price, Stripe Price, staff/public visibility, or referral eligibility. Activating a future approved version is a catalog/configuration change, not a website, portal, CRM, tax, entitlement, or routing rebuild.

Pricing is calculated server-side from catalog version plus bin count; clients render the returned breakdown. Persist the selected version and base/additional/subtotal/tax/total snapshots on signup, invoice, payment, entitlement, and history records.

## Proposed data domains

- **Identity/access:** auth user mapping, customer/staff/admin profile, roles/permissions, login status, recovery/audit events.
- **Customer/lead:** customer ID, contact/address validation, source, signup status, trash/recycling declarations, return/access instructions, consent and activity.
- **Catalog/history:** plans, versions, Stripe references, tax class, referral eligibility, plan-change requests and audit.
- **Billing/tax:** Stripe customer/subscription/checkout/invoice/payment references; separate payment/subscription states; calculation snapshots containing validated address/status, jurisdictions, rate, taxable subtotal, tax, total, classification, provider ID, timestamp.
- **Service:** separate service status; pickup source values, holiday dates, calculated cleaning date, verification/review; service history.
- **Entitlements:** one idempotently created entitlement per successful paid cycle, lifecycle status, source invoice/payment, cycle boundaries, and a uniqueness rule preventing more than one completion.
- **Routing/field:** zones, multiple zone runs, capacity, stops/order, route status, evidence/photos, return confirmation/exceptions, surcharge review, notifications, staff/equipment logs.
- **Referral ledger:** permanent codes, attribution, qualification hold/events, expiring credit entries, applications and reversals.

Keep login, signup, payment, subscription, service, entitlement, and route states as separate columns/state histories. Use database constraints, idempotency keys, immutable financial snapshots, timestamps, reason codes, and actor audit records.

## Security and privacy

- Default-deny RLS: customers read/update only permitted fields on their own records; staff/admin policies are role-specific. Service-role access stays server-side.
- Recheck staff/admin roles on every privileged server operation. Log sensitive actions and status changes.
- Verify Stripe webhook signatures, enforce idempotency, and reject client-authored price/tax/status values.
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

Provider-specific identifiers belong in protected configuration or catalog records, not duplicated client code. No real values are authorized in planning.

## Delivery constraints

This proposal installs no packages, creates no Supabase project, creates no Stripe products/prices, supplies no credentials, and adds no application code. Stripe remains test-only. Live signup waits for connected account, portal, test billing, and minimum CRM behavior. See the roadmap for staged implementation and the decision log for approval gates.
