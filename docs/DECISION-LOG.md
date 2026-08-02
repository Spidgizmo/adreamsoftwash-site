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

### Signup, accounts, and operations

- Both customer and staff-assisted signup use the same account type, records, catalog/pricing/tax/referral services, Stripe billing, automation, entitlements, and route foundation. Pending and incomplete signups remain CRM-visible with their source/status.
- Login, signup, payment, subscription, service, entitlement, and route statuses are independent. Failed payment never deletes or blocks portal/billing access.
- Returning bins to the selected storage location is standard service; instructions appear in portal/CRM and future workers must return and photograph them or record an exception.
- Pickup source values remain separate. Cleaning normally occurs the next calendar day after collection, including holiday-adjusted collection; mismatches create staff review rather than overwrite.

### Payments, tax, entitlements, and routes

- Stripe Checkout, Billing, payment links, webhooks, and billing portal remain test-mode-only until separate approval. Card data is never stored, logged, or committed.
- Exact validated-address tax is dynamically calculated through one replaceable provider interface initially supporting Stripe Tax; no hardcoded city/county/ZIP/rate table. Each transaction stores a tax audit snapshot and future invoices use current address/rules.
- Each successful paid service cycle creates exactly one cleaning entitlement. Multiple/fifth-week zone runs do not create extra monthly cleanings, and one entitlement cannot have multiple completions.
- A zone may run multiple times monthly. Frequency determines entitlement; routing determines the eligible operating date.
- Failed recurring payment creates an immediate service hold and seven-calendar-day deadline. No cleaning occurs. Continued nonpayment causes suspension; later success reactivates to the next eligible zone run without a special trip or billing-anniversary change.

### Referral program

- **Share 50%. Get 50%.** is approved for eligible Monthly residential subscriptions only at launch.
- The new customer receives 50% off the eligible first monthly base cleaning. The referrer receives 50% of their own next eligible monthly base cleaning after completed/paid/good-standing service and a seven-day review hold.
- Permanent unique code, one code per new account/address, stacking two credits to 100%, rollover, 12-month expiry, exclusions, anti-fraud/reversal rules, and portal visibility described in the MVP are approved.

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
