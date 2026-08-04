# ADS Bin Cleaning decision log

**Decision owner:** James Gibbs
This log separates approved direction from decisions still requiring owner approval. Approved rules are not open questions.

## Approved decisions

### Product and delivery

- ADS Bin Cleaning is one connected system in the existing Next.js App Router/Tailwind repository, backed by one Supabase Postgres customer system with Supabase Auth, RLS, and protected staff/admin roles.
- Public page, self-signup, assisted signup, portal, CRM, Stripe/tax, entitlements, and future routes share that foundation from inception. They are not separate applications.
- Every surface is fully responsive across phone/tablet/laptop/desktop, widths, and portrait/landscape; mobile-first is not mobile-only.
- Bin cleaning does not use Lavo, and the existing exterior-cleaning Lavo workflow remains untouched.
- User-facing order is responsive public page; account/portal; website and staff signup with Stripe test payments; protected CRM; then route/field functions. Foundation work precedes/supports these stages, and live signup waits for account, portal, test billing, and minimum CRM connectivity.

### Catalog and pricing

- James Gibbs approved the updated launch pricing on 2026-08-02; it is represented by the effective catalog version for that pricing decision.

- Active launch plans are Monthly, Quarterly, Twice a Year, and One-Time Cleaning.
- Monthly is calendar-month recurring: $20 first bin plus $5 each additional bin.
- Quarterly is three-calendar-month recurring: $35 first bin plus $5 each additional bin.
- Twice a Year is six-calendar-month recurring, normally two cycles/year: $50 includes up to two bins, then $10 each additional bin.
- One-Time is $60 including up to two bins, then $10 each additional bin, with no recurring subscription.
- Every 2 Weeks is future/inactive without price, Stripe Price, public/staff selection, or referral eligibility. Every 4 Weeks, Every 8 Weeks, and Bi-monthly are not launch plans.
- One central effective-dated/versioned service-plan catalog supplies all website, signup, Stripe, portal, CRM, tax, entitlement, route, invoice, and reporting functions.

### Promotional code NEW25

- James Gibbs approved the marketing promotional code **NEW25** on 2026-08-03.
- NEW25 is available only to new Monthly subscribers.
- NEW25 gives 25% off the first month's selected Monthly subscription subtotal before tax. It applies to that first charge only; later Monthly renewals return to the regular selected-plan price before tax.
- NEW25 is not valid for Quarterly, Twice a Year, One-Time Cleaning, or the inactive Every 2 Weeks plan.
- NEW25 does **not** stack with the **Share 50%. Get 50%.** new-customer referral discount or another discount. A checkout containing both must not apply both; the customer must proceed with only one eligible discount.
- The signup page must accept the code directly and may also receive it through a marketing link parameter. Eligibility, exclusivity, and the final discount must be revalidated server-side during checkout rather than trusted from the browser.
- NEW25 remains visibly advertised on the website so a visitor who arrives for another ADS service can discover the bin-cleaning offer.

### Signup, accounts, and operations

- Both customer and staff-assisted signup use the same account type, records, catalog/pricing/tax/referral services, Stripe billing, automation, entitlements, and route foundation. Pending and incomplete signups remain CRM-visible with their source/status.
- Login, signup, payment, subscription, service, entitlement, and route statuses are independent. Failed payment never deletes or blocks portal/billing access.
- Returning bins to the selected storage location is standard service; instructions appear in portal/CRM and future workers must return and photograph them or record an exception.
- Pickup source values remain separate. Cleaning normally occurs the next calendar day after collection, including holiday-adjusted collection; mismatches create staff review rather than overwrite.
- James Gibbs approved the launch standard service on 2026-08-02: interior and exterior bin cleaning; chemical pre-treatment when needed; hands-on brushing, especially during the manual-equipment launch phase; pressure washing; sanitizing and deodorizing; controlled wastewater capture and handling; before-and-after service photographs; and return to the customer's designated storage location. This approval does not authorize promises about a specific machine, hot-water cleaning, complete stain removal, sterilization, elimination of every odor, or another unapproved result.
- James Gibbs confirmed on 2026-08-02 that the existing exterior-cleaning Lavo quote remains available in the global header. On ADS Bin Cleaning routes it is labeled **Exterior Cleaning Quote**, while the primary bin-cleaning action uses the separate signup preview and never routes through Lavo.

### Payments, tax, entitlements, and routes

- Stripe Checkout, Billing, payment links, webhooks, and billing portal remain test-mode-only until separate approval. Card data is never stored, logged, or committed.
- Exact validated-address tax is dynamically calculated through one replaceable provider interface initially supporting Stripe Tax; no hardcoded city/county/ZIP/rate table. Each transaction stores a tax audit snapshot and future invoices use current address/rules.
- Each successful paid service cycle creates exactly one cleaning entitlement. Multiple/fifth-week zone runs do not create extra monthly cleanings, and one entitlement cannot have multiple completions.
- A zone may run multiple times monthly. Frequency determines entitlement; routing determines the eligible operating date.
- Failed recurring payment creates an immediate service hold and seven-calendar-day deadline. No cleaning occurs. Continued nonpayment causes suspension; later success reactivates to the next eligible zone run without a special trip or billing-anniversary change.

### Referral program

- **Share 50%. Get 50%.** is approved for eligible Monthly residential subscriptions only at launch.
- The new customer receives 50% off the eligible first monthly base cleaning. The referrer receives 50% of their own next eligible monthly base cleaning after completed/paid/good-standing service and a seven-day review hold.
- Every customer account receives one permanent unique referral code at signup. The code remains attached to that customer and is displayed in the portal with a shareable referral link.
- Signup keeps a separate promotional-code field and referral-code field because promotional codes may also be used for future campaigns or later subscription offers. Applying one type removes/locks the other type for that signup. The customer may remove the selected code and switch before payment, but only one discount can reach checkout.
- Permanent unique code, one code per new account/address, stacking two earned referral credits to 100%, rollover, 12-month expiry, exclusions, anti-fraud/reversal rules, and portal visibility described in the MVP are approved.
- Referral-credit stacking within the referral program does not authorize stacking NEW25 with the new-customer referral discount.

## Decisions moved from unresolved to approved by the current directive

- The four-plan launch menu and removal of Every 2 Weeks/Every 4 Weeks/Every 8 Weeks/Bi-monthly from launch.
- Monthly, Quarterly, Twice-a-Year, and One-Time pricing and billing forms, including the six-month cadence for Twice a Year.
- Central active/inactive, versioned catalog and shared pricing engine.
- Connected architecture, technology direction, responsive scope, build order, and separation from Lavo.
- Customer and staff-assisted signup behavior, lead/source retention, separate statuses, portal/CRM scope, and card-data prohibition.
- Dynamic exact-address tax architecture and audit requirements (legal taxability/live approval remain open).
- Seven-day payment-hold/suspension/reactivation behavior, original anniversary, and no-special-trip rule.
- Exactly-one cleaning entitlement per successful paid cycle and support for multiple zone runs.
- Pickup-to-next-day rule, source preservation/mismatch review requirement, and included bin return.
- Core **Share 50%. Get 50%.** structure and eligibility rules; it is no longer unresolved.
- Future route/field data foundation and plan-change audit requirements (specific change economics remain open).
- NEW25 as a 25%-off-first-month promotion for new Monthly subscribers only.
- NEW25 is exclusive and cannot stack with the new-customer referral discount or another discount.

## Owner decisions required

Only these genuinely unresolved items remain:

1. Supported launch service territory.
2. Exact outside-service-area behavior.
3. Final official schedule-registry source.
4. Final staff workflow for schedule mismatches.
5. Final holiday-delay data-entry workflow before municipal automation.
6. Final plan-change rules: mid-cycle upgrades/downgrades, proration, credits, refunds, immediate charges, and unused entitlements.
7. Final cancellation and refund rules.
8. Final same-calendar-date behavior for billing anniversaries originating on the 29th, 30th, or 31st.
9. Final portal authentication and account-recovery choices.
10. Final staff roles and permissions.
11. Final customer communication and consent wording, including payment and reactivation notices.
12. Final Ohio taxability classification and approval for live tax collection, subject to owner/accountant/legal confirmation.
13. Final policy for preserving, expiring, or otherwise resolving an unpaid cleaning entitlement after seven-day suspension.

No implementation may invent an answer. Record the owner decision, effective date, approver, and affected plan/version before automation or live activation.

## Agent 2 implementation record — 2026-08-02 (no new owner decisions)

The approved Supabase/Auth/RLS direction is represented by a test-only migration and fictional seed. The four requested implementation roles are enforced as the current test permission baseline; because the earlier log still requires final owner approval of staff permissions, these permissions are not authorized for production activation. No service area, tax conclusion, live communication, plan-change economics, payment behavior, or production policy was inferred. Production credentials, signup, Stripe, tax, scheduling, customer storage, messaging, and deployment remain inactive.

## Agent 2 correction record — no new owner decision

The correction implements secure test-session routing, database-backed test operations, auditable pending route-change requests, and the approved referral address lookback without permanently reserving an address. These are test controls, not authorization for production roles, credentials, signup, billing, tax, communications, routing, or deployment.

## Entitlement foundation record — no new owner decision

The correction implements the already approved exactly-one entitlement per paid cycle and exactly-one completed cleaning per entitlement as test database constraints. It does not decide or activate unresolved expiry, failed-payment preservation, Stripe, or live billing behavior.

## NEW25 website-preview implementation record — 2026-08-03

The responsive signup preview now accepts and validates NEW25 against one centralized promotion rule, shows the 25% first-Monthly-charge estimate, rejects non-Monthly use, accepts a normalized marketing-link parameter, and clearly states that NEW25 cannot be combined with the referral offer. The centralized rule marks NEW25 as non-stackable with referral discounts, and the shared combination check blocks a checkout state containing both until one discount is selected. This does not activate live signup or Stripe redemption. Phase 4 must revalidate new-subscriber eligibility, persist an idempotent redemption record, and enforce the approved non-stacking rule at the trusted checkout boundary.

## Referral-code signup clarification and implementation record — 2026-08-03

James Gibbs confirmed that NEW25 remains promoted on the website, the signup retains distinct promotional and referral code fields, and the fields are mutually exclusive rather than stackable. The preview now clears and locks the opposite field when one valid code type is selected and permits removal before switching. Supabase already contains the referral tables; the added trusted provisioning migration gives each real customer account one permanent code automatically at customer creation, provides an idempotent service-role provisioning function for the signup transaction, and keeps anonymous callers from generating codes. Live signup, Stripe, and real-customer activation remain disabled.

## ONE45 card-campaign decision — 2026-08-04

James Gibbs approved the private card promotion code **ONE45**. The exact code is the letters `O-N-E` followed by the digits `4-5`; it is not numeric `145`.

- ONE45 is a card-only new-customer acquisition offer and is not displayed as the general website One-Time price.
- It applies only to a One-Time Cleaning purchase with exactly two bins.
- It changes the normal $60 pre-tax subtotal to $45 before tax, a $15 discount.
- The customer redeems it by entering ONE45 in the promotional-code field before payment.
- It is limited to one successful redemption per customer and one per service address.
- It is redeemable through September 1, 2026 in the America/New_York business time zone.
- It cannot stack with NEW25, a referral discount, or any other promotion.
- Entry is case-insensitive, but the stored/displayed normalized code is ONE45.
- Trusted checkout must revalidate plan, exact bin count, new-customer and address history, deadline, prior redemption, tax basis, and final cents. Browser preview is not authoritative.

The authoritative cross-system rule set is `docs/ADS-BIN-CLEANING-LAUNCH-CONFIG.md`; code mirrors it in `src/lib/bin-cleaning-launch-config.ts`. This decision does not activate live signup or Stripe.

## Launch-checklist Step 1 completion record — 2026-08-04

James Gibbs approved the launch-rule set, including ONE45. The permanent catalog remains the only source of normal prices; NEW25 remains publicly advertised; ONE45 remains private/card-only; promo and referral discounts remain mutually exclusive; referral-code provisioning, pickup-plus-one-day cleaning, included bin return, seven-day failed-payment handling, and next-normal-route reactivation remain approved. Step 1 is complete at configuration version `2026-08-04-launch-rules-v1`; hosted staging remains the next step.
