# ADS Bin Cleaning MVP product requirements

**Owner and final decision-maker:** James Gibbs
**Status:** Planning; no live activation is authorized

The current controlling promotion and operating rules are in `docs/ADS-BIN-CLEANING-LAUNCH-CONFIG.md`. That latest owner-approved configuration supersedes historical wording if another planning record conflicts.

## 1. Purpose and boundaries

ADS Bin Cleaning will be a connected system within the existing American Dream Softwash Next.js repository. A fully responsive public page, self-signup, staff-assisted CRM signup, customer accounts and portal, Stripe billing, dynamic address-based tax, the internal CRM, cleaning entitlements, and future route/field workflows will use one shared backend and customer database. They are not separate applications to connect later.

The system must not use Lavo or send bin-cleaning customers through Lavo. Its signup, accounts, portal, Stripe billing, CRM, scheduling, and future route management are independent. The existing exterior-cleaning Lavo quote workflow must remain unchanged.

All experiences—including public pricing, signup, portal, staff signup, CRM, and future field screens—must adapt across phones, tablets, laptops, desktop monitors, different widths, and portrait and landscape orientations. Mobile-first is allowed; mobile-only is not.

## 2. Launch catalog and approved pricing

Exactly four plans are active at launch:

| Plan | Type and interval | Base price | Additional bins | Base includes | Referral eligible |
| --- | --- | ---: | ---: | ---: | --- |
| Monthly | Recurring each calendar month | $20 | $5 each | 1 bin | Yes, eligible residential subscriptions only |
| Quarterly | Recurring every 3 calendar months | $35 | $5 each | 1 bin | No |
| Twice a Year | Recurring every 6 calendar months; normally 2 paid cycles/year | $50 | $10 each after first 2 | Up to 2 bins | No |
| One-Time Cleaning | One payment; no automatic subscription | $60 | $10 each after first 2 | Up to 2 bins | No |

Examples for 1/2/3/4 bins: Monthly costs $20/$25/$30/$35; Quarterly costs $35/$40/$45/$50; Twice a Year costs $50/$50/$60/$70; One-Time costs $60/$60/$70/$80.

Every 2 Weeks is a future **inactive** catalog plan: it is not public, staff-selectable, priced, provisioned in Stripe, or referral eligible at launch. Every 4 Weeks, Every 8 Weeks, and Bi-monthly are not launch offerings. Future activation must be configuration-driven without rebuilding other system surfaces.

### Central service-plan catalog

One versioned catalog supplies the public pricing page, website and staff signup, Stripe Checkout/subscriptions, portal, CRM, tax calculation, entitlements, routing, invoices, and reporting. Each record supports:

- internal plan ID, customer-facing name, and description;
- active/inactive and recurring/one-time states;
- billing interval unit/quantity and service interval unit/quantity;
- first-bin price, additional-bin price, and bins included in base price;
- referral eligibility and product tax classification;
- Stripe product and price references;
- effective date and historical pricing version.

No surface may carry an independent copy of pricing rules. Historical transactions retain their plan/pricing version.

## 3. Responsive pricing and signup

The public page provides an accessible, responsive selector/comparison for active plans. Each option explains its name, cleaning frequency, recurring/one-time status, first-bin and additional-bin pricing, included bins, standard-service inclusions, referral eligibility, and billing interval.

After plan and bin count selection, show selected plan, bin count, base price, additional-bin charges, subtotal, dynamically calculated tax, total due today, and either the future billing interval or one-time status. The selection and calculation carry unchanged through account creation, tax, Stripe, portal, CRM, entitlement, routing, invoice, and service history.

### Customer self-signup

Collect plan, bin count, full name, mobile, email, validated service address, customer-confirmed normal trash day, applicable recycling schedule, designated bin-return location, gate/driveway/access/return instructions, optional referral code, optional promotional code, terms acceptance, and the reviewed subtotal/tax/total.

The action may read **Create Account & Continue to Payment**. It must securely create login credentials, a provisional customer and unique internal customer ID, save signup data, set signup to `pending payment`, expose that record in CRM, and then continue to Stripe. Account creation is not proof of payment or active service.

### NEW25 marketing promotion

NEW25 is an active marketing code for new Monthly subscribers only. It discounts the first month's selected Monthly subscription subtotal by 25% before tax. The first-charge summary must show the normal subtotal, promotional discount, discounted first-month subtotal, tax, and total. Later monthly renewals use the regular selected-plan price before tax.

The signup page accepts typed NEW25 and a normalized marketing-link parameter. Code matching is case-insensitive for usability, but the stored/displayed code is NEW25. Quarterly, Twice a Year, One-Time Cleaning, and inactive plans receive no NEW25 discount. The browser preview is not authoritative: the server/checkout service must revalidate the code, plan, account history, new-subscriber eligibility, effective status, non-stacking eligibility, and final cents before creating Stripe Checkout or a subscription.

NEW25 does **not** stack with the **Share 50%. Get 50%.** new-customer referral discount, ONE45, or another discount. Checkout must apply only one eligible discount, and the chosen/declined decision must be preserved in the audit trail.

### ONE45 public new-customer promotion

ONE45 is publicly advertised on the website and signup page. The exact code is letters `O-N-E` followed by digits `4-5`; it is not numeric `145`.

- Eligible purchase: One-Time Cleaning with exactly two bins.
- Normal pre-tax subtotal: $60.
- ONE45 pre-tax subtotal: $45.
- Discount: $15.
- Eligible customer: genuinely new ADS Bin Cleaning customer only.
- Usage: one successful redemption per customer. An established customer cannot return six months, one year, or later and receive the offer again.
- Service-address history is checked against duplicate-account abuse.
- Deadline: through September 1, 2026 in `America/New_York`.
- Non-stacking: cannot combine with NEW25, a referral discount, or another promotion.
- Matching: case-insensitive entry; normalized stored/displayed code is ONE45.

The normal One-Time catalog price remains $60 for up to two bins. ONE45 is shown as a limited promotion and does not replace that catalog price. The browser may display an eligible preview, but the trusted checkout service must verify identity/customer history, service-address history, prior redemption, selected plan, exact bin count, deadline, tax basis, and final cents. Future One-Time purchases by that customer use the regular price.

### Staff-assisted signup and leads

The protected CRM includes **Add New Customer** for phone, in-person, door-hanger, advertising, and assisted customers. Staff collect the same information and use the identical catalog, pricing, address validation, tax, referral, promotion, account, entitlement, and status services. Staff can review subtotal/tax/total, create a pending account, and text or email a secure Stripe payment link.

Signup sources include Website, Staff phone, Staff in person, Door-hanger call, Existing ADS customer, Manual import, and another approved marketing source. Leads/incomplete signups remain visible with at least: New lead, Information requested, Signup started, Payment link sent, Pending payment, Active, Declined, Not interested, and Canceled.

Website and staff-assisted customers share the same database, account type, portal, billing, CRM, referral, promotion, tax, automation, entitlements, and route records. Full card numbers, security codes, or raw card data must never enter notes, the database, repository, or logs.

## 4. Accounts, portal, CRM, and security

Persist login, signup, payment, subscription, service, cleaning-entitlement, and route statuses separately—never one generic active flag. Workflows support Lead, Signup started, Pending payment, Active, Payment hold, Payment grace, Suspended for nonpayment, Reactivated, and Canceled where applicable.

Customers can access only their own data. Staff and administrator areas require authentication and role-based authorization; administrator-only actions require both.

### Customer portal

Display customer/name/login/account/payment/subscription/service states; current plan/version, frequency and recurring status; bin count, base price, tax and total; address, normal pickup day, expected cleaning day; current entitlement, next eligible service date when known, and last completed cleaning; return/access instructions; billing history, invoices and Stripe payment-method access; eligible referral details; promotional redemption history; service history and requests; and payment-hold, suspension, and reactivation messages.

One-time customers can view receipt, schedule, service status/history and future photos; buy another one-time service; and request a recurring-plan upgrade. A previous ONE45 customer sees regular pricing for a later One-Time purchase.

### Internal CRM

The CRM receives every lead, website/staff/incomplete/pending signup, active/past-due/suspended/canceled customer. It stores/displays customer ID, source, contact details, validated address/result, plan/version/type/frequency, bins, base/discount/tax/total, pickup/cleaning/holiday schedule, return/access details, referral details, promotion/redemption details, discount-conflict/selection details, payment/subscription/service states, grace deadline, current entitlement, last service, zone/next eligible run, schedule verification, notes, activity, plan-change history, and pricing history.

For ONE45, CRM history must make prior successful use and established-customer ineligibility visible without requiring staff to inspect raw Stripe or database records.

## 5. Billing, tax, and payment lifecycle

Use Stripe Checkout, Billing subscriptions, customer billing portal, secure payment links, and webhooks in **test mode only** until separately approved. Support monthly, three-month, six-month, and one-time charges with anniversary-based recurring billing. Webhooks update local payment/service states, entitlements, referrals, promotion redemptions, invoice/tax records, holds, suspension, and reactivation. Never commit credentials.

### Address-based tax

Website and CRM signup use one replaceable tax-provider interface, initially compatible with Stripe Tax, against the exact validated service address. Never hardcode rates by city, county, ZIP, or a manually maintained rate table, and never hardwire the CRM to one provider.

Before checkout, in Stripe Checkout, on invoices, in the portal, and in CRM, display tax separately. Each invoice/payment keeps an audit snapshot of validated address, validation state, returned jurisdictions, applied rate, taxable subtotal after the one eligible discount, discount lines, tax, total, product classification, provider calculation ID, and calculation timestamp. Recurring invoices use the current validated address and current rules rather than freezing signup tax. Ohio taxability and live collection await owner/accountant/legal approval.

### Failed payment and seven-day rule

On a recurring payment failure, immediately put service on payment hold, hold/remove the upcoming active route stop, preserve login/portal access, record failure time and seven-calendar-day deadline, show CRM/portal warnings, send approved notices, and allow configured Stripe retries. No cleaning occurs on hold.

If still unpaid after seven calendar days, set service to `suspended for nonpayment`, remove future active route stops, preserve the unpaid entitlement according to the final approved policy, preserve portal/billing access, record reason/date, and show suspension in CRM.

Later success automatically updates payment/subscription/portal/CRM, reactivates service and route eligibility, assigns the entitlement to the next eligible zone run, and sends an approved notice. It never changes the original billing anniversary. It never creates a same-day return, random-day special trip, or cleaning after bins may contain trash.

## 6. Cleaning entitlements, schedules, and routes

Every successful payment creates exactly one entitlement for that paid cycle: one per calendar-month payment, three-month payment, six-month payment, or one-time payment. A fifth week and multiple zone runs never create an extra monthly cleaning. Prevent multiple completed cleanings against one entitlement.

Entitlement states include Created, Pending payment, Due, Scheduled, Payment hold, Moved to next eligible zone run, Completed, Skipped, Refused, Canceled, and Expired only when a rule is approved. Service frequency controls when entitlement arises; route schedules control when ADS operates locally. These are separate concepts.

ADS may run the same zone multiple times per month, such as several Tuesdays. Assign the appropriate run using paid entitlement, payment/service states, trash schedule, capacity, existing zone schedule, and missed/late-payment conditions. A late-clearing recurring payment moves to the next eligible scheduled zone run after trash collection—never a special trip.

### Pickup and cleaning date

Store customer-confirmed pickup, official/registry-derived pickup, holiday-adjusted pickup date, calculated cleaning date, and staff verification separately. Normal cleaning is the next calendar day: Monday→Tuesday, Tuesday→Wednesday, Wednesday→Thursday, Thursday→Friday, Friday→Saturday. A holiday shift moves cleaning to the calendar day after adjusted collection.

When sources disagree, preserve both, create a protected staff-review item, and record the staff-approved result; never silently overwrite either.

### Standard bin return

Return to the customer's designated storage location is included. Signup captures preferred location, gate, driveway, access, safety/accessibility, and other return notes; portal and CRM show them. Future field work shows the location, requires return and an after photo, and records completion or exception.

### Approved standard service

James Gibbs approved the launch standard service on 2026-08-02. It includes interior and exterior bin cleaning, chemical pre-treatment when needed, hands-on brushing (especially during the manual-equipment launch phase), pressure washing, sanitizing and deodorizing, controlled wastewater capture and handling, before-and-after service photographs, and returning cleaned bins to the customer's designated storage location.

Public and operational materials must describe these inclusions accurately without promising a specific machine, hot-water cleaning, complete stain removal, sterilization, elimination of every odor, or another unapproved result.

### Future field foundation

The initial data model supports multiple zone runs, entitlements, assignment/capacity/stop order, before/after/return photos, skipped/refused evidence, contamination and surcharge approval, completion/customer messages, holiday shifts, staff logs, gratuities, municipal automation, and equipment/route reporting without replacing the customer core.

## 7. Share 50%. Get 50%.

The approved program applies only to eligible Monthly residential subscriptions at launch—not Quarterly, Twice a Year, One-Time, or future Every 2 Weeks unless separately approved.

A genuinely new eligible customer gets 50% off the eligible base price of the first regular monthly cleaning. After that cleaning is completed, paid, not refunded/disputed/charged back, and past a seven-calendar-day review hold, the referrer earns a credit equal to 50% of their own next eligible monthly base cleaning.

Each eligible Monthly customer receives a permanent unique code during signup. Limit one code per new account and qualifying address. Two earned referral credits can cover up to 100% of an eligible base invoice; excess rolls forward and expires 12 months after earning. Credits have no cash value, are nontransferable, cannot make an invoice negative, and exclude tax, gratuity, contamination/debris/restoration/missed-service/return-trip charges, additional non-plan bins, and unrelated ADS services. Failure, refund, dispute, chargeback, self-referral, duplicate account, or fraud can block/reverse rewards.

The internal rule allowing two earned referral credits to cover up to 100% does not allow NEW25 or ONE45 to stack with the new-customer referral discount. A new customer uses exactly one eligible discount source on the first charge.

Portal views include code/link, pending/qualified referrals, available/applied balances, history, and reversals.

## 8. Plan changes

Support future transitions among launch and later-active plans. Audit previous/new plan, request/effective dates, previous/new billing interval, price and bin count, request source, staff approval, payment/entitlement effects, and full history. Do not automate or invent mid-cycle upgrade/downgrade, proration, credit/refund, immediate-charge, or unused-entitlement treatment before owner approval.

## 9. Release gate

The public page may be built visually first, but live signup remains disabled until accounts, portal, Stripe test billing, and minimum CRM connectivity work together. Deployment, live Stripe/tax, and release require separate approval.

## 10. Promotion implementation boundary

The current public page and signup preview may display NEW25 and ONE45 and calculate a non-authoritative preview. They do not prove a customer is new, reserve or redeem a discount, accept payment, or authorize service.

Trusted promotion implementation must:

- identify the customer across current and historical account records;
- check service-address history for duplicate-account abuse;
- record every attempt, rejection, selection, successful redemption, refund, dispute, reversal, and staff action;
- enforce one successful ONE45 redemption per customer for all future time;
- reject established customers even if they use a different email, phone number, or return months later;
- enforce ONE45's plan, exact-bin-count, deadline, normal subtotal, discount, tax basis, and non-stacking rules;
- keep later One-Time purchases at the regular catalog price;
- use idempotency so checkout/webhook retries cannot create duplicate benefits.

Refund, dispute, chargeback, duplicate-account/address, or fraud handling must preserve an auditable promotion state and may reverse or block the benefit according to the trusted promotion lifecycle.
