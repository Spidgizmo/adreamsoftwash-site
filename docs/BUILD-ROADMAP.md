# ADS Bin Cleaning connected build roadmap

All phases extend one Next.js/Supabase application foundation and shared customer database. The page, portal, signup, CRM, billing, entitlements, and routing are connected modules from inception. Every user/staff surface is fully responsive; Stripe remains test-only until separately approved. James Gibbs owns phase and release decisions.

## Phase 1 — Shared foundation

- Design the shared data model, Supabase Auth, RLS, protected staff/admin authorization, security/audit controls, and distinct login/signup/payment/subscription/service/entitlement/route states.
- Establish the central versioned plan catalog and one pricing engine used everywhere.
- Seed/specify the four active launch plans with their approved pricing; represent Every 2 Weeks only as future/inactive.
- Establish cleaning-entitlement idempotency and future route/field-ready data structures, including multiple zone runs.

## Phase 2 — Responsive public page and pricing

- Build the fully responsive ADS Bin Cleaning page and active-plan selector using the existing Tailwind system.
- Show standard service, bin-return inclusion, referral eligibility, billing interval, calculated line items, dynamic tax placeholder/contract, and total.
- Do not expose live signup yet and do not disturb Lavo.
- Present the owner-approved standard-service scope accurately without adding unapproved equipment or result claims; retain the clearly labeled global **Exterior Cleaning Quote** while keeping every bin-cleaning action separate from Lavo.

## Phase 3 — Customer account and portal foundation

- Create customer identity/account and RLS foundations with separate statuses.
- Build responsive portal views for plan, billing, tax, entitlements, schedules, return instructions, service history, warnings, and eligible referrals.
- Support one-time customer receipts, service views, repeat purchase, and upgrade requests.

## Phase 4 — Connected signup and Stripe test billing

- Implement website self-signup and CRM staff-assisted signup against the same customer, catalog, pricing, referral, and status services.
- Validate exact service addresses and calculate tax through a replaceable provider adapter initially supporting Stripe Tax.
- Use Stripe Checkout/Billing/payment links in test mode, billing portal, signed webhooks, tax audit snapshots, pending-payment leads, and anniversary billing.
- Keep live signup gated until account, portal, test billing, and minimum CRM connectivity pass together.

## Phase 5 — Protected internal CRM

- Deliver responsive, authenticated, authorized staff/admin CRM views over the same leads, customers, signups, billing, schedules, entitlements, referral, tax, plan/pricing histories, and activity records.
- Add New Customer uses the Phase 4 shared assisted-signup flow; incomplete and unpaid signups remain visible.
- Add protected pickup-source mismatch review and role-scoped administrator actions.

## Phase 6 — Payment and entitlement automation

- Automate immediate payment holds, seven-calendar-day deadlines, suspension, retained portal access, approved notices, and webhook-based reactivation.
- Hold/remove route stops while unpaid, preserve entitlement per the final approved policy, restore next-eligible-zone-run assignment after recovery, and never create special trips or alter the billing anniversary.
- Test exactly-one entitlement per paid cycle and exactly-one completion per entitlement.

## Phase 7 — Route and field service

- Implement multiple zone runs/month, capacity, assignment and stop ordering based on entitlement/payment/service/trash schedules.
- Add holiday shifts, before/after/return evidence, bin-return confirmation/exceptions, skipped/refused/contamination evidence, surcharge approval, notices, activity, gratuity, and equipment/route reporting foundations.
- Add municipal schedule automation only after its source/workflow is approved.

## Phase 8 — Release readiness and separately approved deployment

- Run integration, webhook/idempotency, responsive/orientation, browser, accessibility, RLS/authorization, security/privacy, financial/tax snapshot, recovery, and operational acceptance tests.
- Resolve all release-blocking owner decisions, confirm legal/accounting tax treatment, validate test-mode-to-live configuration, and document rollback/monitoring.
- Deployment, live payments/tax, and public activation occur only with separate James Gibbs approval; they are not authorized by this roadmap.

## Cross-phase acceptance rules

- No Lavo dependency or modification to the exterior-cleaning quote workflow.
- No duplicated plan/pricing rules and no hardcoded location tax tables.
- No raw payment-card data or committed secrets.
- No mobile-only surface.
- No active Every 2 Weeks, Every 4 Weeks, Every 8 Weeks, or Bi-monthly launch offering.
- No invented tax conclusion, proration/refund behavior, or other unresolved policy.

## Agent 2 delivery checkpoint (test-only)

- Phase 1 database/Auth/RLS, catalog snapshot, role, audit, schedule, referral, and field-completion foundations are implemented as migrations and automated contracts.
- Phase 3 responsive portal foundation and Phase 5 CRM/field previews are implemented against fictional test fixtures.
- Live signup remains gated. Agent 3 must connect server-rendered authenticated queries/mutations, Stripe test billing/webhooks, address/tax provider test adapters, notification fakes, entitlement automation, photo-storage signed URLs, and full route scheduling before release consideration.
