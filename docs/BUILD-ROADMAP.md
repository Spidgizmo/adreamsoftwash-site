# ADS Bin Cleaning connected build roadmap

All phases extend one Next.js/Supabase application foundation and shared customer database. The page, portal, signup, CRM, billing, promotions, entitlements, and routing are connected modules from inception. Every user/staff surface is fully responsive; Stripe remains test-only until separately approved. James Gibbs owns phase and release decisions.

## Phase 1 — Shared foundation

- Design the shared data model, Supabase Auth, RLS, protected staff/admin authorization, security/audit controls, and distinct login/signup/payment/subscription/service/entitlement/route states.
- Establish the central versioned plan catalog and one pricing engine used everywhere.
- Establish one trusted promotion-policy boundary so website, CRM, Stripe, invoices, portal, and reporting cannot carry independent discount rules.
- Establish one trusted exclusive-discount resolver so NEW25 and the new-customer referral discount cannot be applied together.
- Seed/specify the four active launch plans with their approved pricing; represent Every 2 Weeks only as future/inactive.
- Establish cleaning-entitlement idempotency and future route/field-ready data structures, including multiple zone runs.

## Phase 2 — Responsive public page and pricing

- Build the fully responsive ADS Bin Cleaning page and active-plan selector using the existing Tailwind system.
- Show standard service, bin-return inclusion, referral eligibility, billing interval, calculated line items, dynamic tax placeholder/contract, and total.
- Add the responsive signup-preview promotional field and first-charge pricing preview for the approved NEW25 new-Monthly-subscriber offer, including invalid and non-Monthly states.
- State clearly that NEW25 cannot be combined with the **Share 50%. Get 50%.** referral offer or another discount.
- Accept a normalized marketing-link parameter such as `promo=NEW25` without treating the client preview as authoritative.
- Do not expose live signup yet and do not disturb Lavo.
- Present the owner-approved standard-service scope accurately without adding unapproved equipment or result claims; retain the clearly labeled global **Exterior Cleaning Quote** while keeping every bin-cleaning action separate from Lavo.

## Phase 3 — Customer account and portal foundation

- Create customer identity/account and RLS foundations with separate statuses.
- Build responsive portal views for plan, billing, tax, entitlements, schedules, return instructions, service history, warnings, eligible referrals, and future promotional redemption history.
- Support one-time customer receipts, service views, repeat purchase, and upgrade requests.

## Phase 4 — Connected signup and Stripe test billing

- Implement website self-signup and CRM staff-assisted signup against the same customer, catalog, pricing, promotion, referral, and status services.
- Validate NEW25 server-side as a new-Monthly-subscriber, first-paid-cycle-only discount; calculate trusted discount cents; persist an idempotent attempt/redemption record; and map it to reviewed Stripe test-mode coupon/promotion configuration.
- Keep NEW25 unavailable to Quarterly, Twice a Year, One-Time Cleaning, and inactive plans. Fail closed for unknown, inactive, expired, reused, or otherwise ineligible codes.
- Enforce the approved non-stacking rule: when valid NEW25 and an eligible new-customer referral discount are both present, do not apply both. Require the checkout to proceed with only one eligible discount and record the selected and declined discount states.
- Validate exact service addresses and calculate tax through a replaceable provider adapter initially supporting Stripe Tax, using the post-discount taxable subtotal from the single applied discount.
- Use Stripe Checkout/Billing/payment links in test mode, billing portal, signed webhooks, tax audit snapshots, pending-payment leads, and anniversary billing.
- Keep live signup gated until account, portal, test billing, and minimum CRM connectivity pass together.

## Phase 5 — Protected internal CRM

- Deliver responsive, authenticated, authorized staff/admin CRM views over the same leads, customers, signups, billing, schedules, entitlements, referral, promotion/redemption, discount-conflict/selection, tax, plan/pricing histories, and activity records.
- Add New Customer uses the Phase 4 shared assisted-signup flow; incomplete and unpaid signups remain visible.
- Add protected pickup-source mismatch review and role-scoped administrator actions.

## Phase 6 — Payment and entitlement automation

- Automate immediate payment holds, seven-calendar-day deadlines, suspension, retained portal access, approved notices, and webhook-based reactivation.
- Hold/remove route stops while unpaid, preserve entitlement per the final approved policy, restore next-eligible-zone-run assignment after recovery, and never create special trips or alter the billing anniversary.
- Test exactly-one entitlement per paid cycle and exactly-one completion per entitlement.
- Test NEW25 exactly-once first-cycle application, no later renewal discount, idempotent webhook/retry behavior, invalid-plan rejection, customer-history eligibility, refund/dispute handling, and rejection of simultaneous referral-discount application.

## Phase 7 — Route and field service

- Implement multiple zone runs/month, capacity, assignment and stop ordering based on entitlement/payment/service/trash schedules.
- Add holiday shifts, before/after/return evidence, bin-return confirmation/exceptions, skipped/refused/contamination evidence, surcharge approval, notices, activity, gratuity, and equipment/route reporting foundations.
- Add municipal schedule automation only after its source/workflow is approved.

## Phase 8 — Release readiness and separately approved deployment

- Run integration, webhook/idempotency, responsive/orientation, browser, accessibility, RLS/authorization, security/privacy, financial/tax/promotion snapshot, recovery, and operational acceptance tests.
- Confirm the approved NEW25 non-stacking rule is enforced across signup, CRM-assisted signup, Stripe test checkout, invoices, portal, refunds/reversals, and reporting; confirm legal/accounting tax treatment; validate test-mode-to-live configuration; and document rollback/monitoring.
- Deployment, live payments/tax, and public activation occur only with separate James Gibbs approval; they are not authorized by this roadmap.

## Cross-phase acceptance rules

- No Lavo dependency or modification to the exterior-cleaning quote workflow.
- No duplicated plan, pricing, or promotion rules and no hardcoded location tax tables.
- No client-authored discount amounts or browser-only eligibility decisions.
- No NEW25/referral stacking; only one eligible discount may apply to the new customer's first charge.
- No raw payment-card data or committed secrets.
- No mobile-only surface.
- No active Every 2 Weeks, Every 4 Weeks, Every 8 Weeks, or Bi-monthly launch offering.
- No invented tax conclusion, proration/refund behavior, or other unresolved policy.

## Agent 2 delivery checkpoint (test-only)

- Phase 1 database/Auth/RLS, catalog snapshot, role, audit, schedule, referral, and field-completion foundations are implemented as migrations and automated contracts.
- Phase 2 now includes the working NEW25 signup preview backed by one centralized promotion rule, a shared non-stacking combination check, and automated pricing/UI wiring tests.
- Phase 3 responsive portal foundation and Phase 5 CRM/field pages are implemented against session-scoped fictional Supabase test records.
- Live signup remains gated. Agent 3 must connect server-rendered authenticated queries/mutations, Stripe test billing/webhooks, promotion redemption records, discount-selection audit records, address/tax provider test adapters, notification fakes, entitlement automation, photo-storage signed URLs, and full route scheduling before release consideration.

### Agent 2 correction checkpoint

Private route middleware, session-scoped database pages, functional test mutations, pending route-change review, referral address history/lookback, and runtime PostgreSQL role tests are now implemented. Agent 3 deferrals and every live-activation gate remain unchanged.

### Entitlement correction checkpoint

Paid-cycle and cleaning-entitlement tables, lifecycle state, idempotency constraints, visit linkage, and one-completion enforcement now satisfy the Phase 1 database foundation. Stripe-driven creation and later payment automation remain in their approved later phases.

### NEW25 preview checkpoint

The signup preview advertises NEW25, accepts typed and URL-supplied codes, calculates 25% off the first Monthly subtotal before tax, shows regular later-renewal pricing, rejects invalid/non-Monthly use, and states that referral discounts cannot be added. The centralized rule marks NEW25 as non-stackable, and the shared combination check blocks simultaneous NEW25/referral application until one discount is selected. It does not yet create Stripe coupons, redeem against a customer account, or persist a live redemption.
