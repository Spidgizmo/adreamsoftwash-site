# ADS Bin Cleaning master launch checklist

Owner: James Gibbs  
System: ADS Bin Cleaning at `www.acleanbin.com`  
Last refreshed: 2026-08-06  
Purpose: one permanent, numbered path from the current test foundation to a controlled public launch.

## How this checklist is used

- Step numbers are permanent and must not be renumbered.
- James can ask, for example, “Is Step 10 done?” and the answer must use that step’s written acceptance test.
- Status values are **NEXT**, **IN PROGRESS**, **BLOCKED**, **READY FOR OWNER TEST**, **DONE**, or **WAITING**.
- A screen existing does not make a step done; the acceptance test must pass.
- Live payments, production deployment, and public signup require James Gibbs’s explicit approval.
- The existing Lavo exterior-cleaning flow remains separate and unchanged.
- The authoritative owner-approved launch rules are in `docs/ADS-BIN-CLEANING-LAUNCH-CONFIG.md` and mirrored in `src/lib/bin-cleaning-launch-config.ts`.

## Current priority snapshot

1. **Step 3 — IN PROGRESS:** finish the secure test-integration boundary and staging verification. Stripe remains disabled.
2. **Step 4 — NEXT:** turn the signup preview into a working fictional-data signup that saves incomplete, abandoned, and pending-payment records.
3. **Steps 5–14 — WAITING:** address/schedule validation, trusted pricing, accounts, Stripe test checkout, activation, portal, CRM, billing recovery, routing, and field workflow.
4. **Step 15 — WAITING:** complete notifications, including the deferred formatted HTML referral email with a clickable **Clean My Bins** link.
5. **Steps 16–18 — WAITING:** policies/public content, full acceptance testing, and controlled production launch.

## Current starting point

The hosted Vercel Preview and hosted Supabase staging project are connected and use fictional data. James has signed into Avery’s fictional account from both computer and phone, verified the portal, logged out, and opened a referral text invitation. The public site, signup preview, data model, authentication and role security, permanent referral-code provisioning, test portal, test CRM, test field foundation, recycling-aligned scheduling foundation, short `/r/ADS-XXXX-XXXX` referral path, and secure integration simulators exist.

The missing center is the working test-mode chain from submitted signup information through trusted pricing, payment, portal activation, CRM visibility, scheduling, service completion, and customer communications.

---

## Step 1 — Lock the launch rules and campaign handling

**Status: DONE — revised and revalidated through launch rules v5**

The locked configuration includes:

- Monthly, Quarterly, Twice a Year, and One-Time permanent catalog prices.
- `NEW25`: publicly advertised, new Monthly subscribers only, 25% off the first Monthly charge.
- `ONE45`: publicly advertised new-customer code; exact spelling is `O-N-E-4-5`; One-Time Cleaning with exactly two bins for $45 before tax instead of the normal $60.
- `ONE45` is limited to one successful use per customer. Established customers are ineligible later, including six months or a year after their first purchase. Service-address history remains an anti-abuse check.
- `ONE45` has no expiration date.
- Referral offer: eligible Monthly residential signup only.
- The referred new customer receives 50% off the eligible base price of the first Monthly cleaning.
- The referrer earns 50% off one eligible Monthly base cleaning for the first qualified lifetime referral and 25% off one eligible Monthly base cleaning for each later qualified referral.
- Referral rewards are not hard-capped, apply one per invoice, queue in earned order, and never stack together.
- ADS retains the ability to pause future referrals without erasing already qualified rewards.
- Only one discount source per checkout; promo/promo and promo/referral stacking are prohibited.
- Every customer receives one permanent unique referral code.
- Trash-only service is cleaned the next calendar day after the next eligible trash collection.
- Service that includes recycling aligns with the next verified eligible recycling collection so both carts are expected to be empty.
- Holiday collection shifts move cleaning to the day after the adjusted collection.
- Cleaned bins are returned to the designated storage location.
- Failed recurring payment uses a seven-calendar-day grace period; portal remains accessible; recovery returns the customer to the next normal eligible route day without a special trip.

**Acceptance result:** passed. The authoritative launch configuration and code agree. Promotions and referral behavior are visible in Preview but cannot collect payment until the later trusted checkout steps are complete.

## Step 2 — Create the hosted test environment

**Status: DONE — owner phone and computer acceptance completed 2026-08-06**

Completed:

- Dedicated hosted Supabase staging project using fictional data only.
- Hosted Vercel Preview connected to the staging branch.
- Separate staging configuration from future production configuration.
- Hosted migrations and fictional seed data applied.
- Staging banner and no-index protections.
- Redacted staging health endpoint.
- Fictional customer and staff authentication.
- James signed into Avery’s fictional customer portal from computer and phone, confirmed the portal loaded, tested the referral invitation handoff, and logged out.
- No real customer information and no live payment credentials are used.

**Acceptance result:** passed. The hosted test website works from phone and computer and is connected to the hosted test database.

## Step 3 — Configure secure test integrations

**Status: IN PROGRESS**

Build and verify the protected server-side integration boundary for Supabase, address validation, tax calculation, email/SMS, and future Stripe test mode. No secret may be committed, returned by a health endpoint, or exposed to browser code.

Completed foundation:

- Server-only integration configuration.
- Safe address-validation simulator.
- Safe tax-review simulator that does not invent a taxability decision or rate.
- Safe notification simulator that accepts fictional `.test` recipients and delivers nothing externally.
- Redacted staging integration-health endpoint.
- Automated checks that protected values are not named as browser-public variables.
- Stripe integration remains explicitly disabled.

Still required:

- Verify the hosted Preview reports the approved simulator modes and no secret values.
- Confirm all Step 3 tests and the full database/security workflow pass on the current branch head.
- Preserve the boundary so actual provider credentials can be added later without changing the signup, pricing, or notification contracts.

**Important sequencing:** Step 3 does not open Stripe Checkout. Stripe test keys and checkout activation belong to Step 8.

**DONE when:** staging proves the server-only integration boundary works, approved simulators are reachable, protected values are not exposed, and Stripe checkout remains disabled.

## Step 4 — Turn the signup preview into a working test signup

**Status: NEXT**

Enable the responsive form in this order: service explanation; address/eligibility; trash/recycling schedule; bin count; plan/price; promo or referral; account details; return/access/safety/contact details; terms; and a review-and-continue-to-payment handoff. Do not open Stripe yet. Save incomplete, abandoned, and submitted-but-unpaid signups to CRM.

The short referral path `/r/ADS-XXXX-XXXX` must forward into signup with the referral code automatically placed in the referral field.

**DONE when:** a fictional customer can enter and submit all required information on phone and desktop, clear validation is shown, the signup reaches a ready-for-trusted-pricing/payment state, and an abandoned or pending-payment signup appears in CRM. No Stripe payment is required in this step.

## Step 5 — Validate address, service eligibility, and collection schedule

**Status: WAITING**

Normalize the exact address, decide service-area eligibility, obtain or collect trash/recycling schedule data, record source/confidence, calculate the correct collection-plus-one-day cleaning date, preserve address history, and create staff review when uncertain.

Trash-only service uses the next eligible trash collection. Service containing recycling uses the next verified eligible recycling collection. Missing recycling data or different trash/recycling weekdays require staff review rather than silent scheduling.

**DONE when:** each test address has an auditable eligibility, pickup, cleaning-day, recycling-alignment, and review result, and uncertain addresses cannot silently enter routes.

## Step 6 — Build trusted pricing and discount validation

**Status: WAITING**

Move final pricing to the trusted server/database boundary. Validate catalog price, bin charges, tax basis, `NEW25`, `ONE45`, referral eligibility, customer/address history, redemption limits, tiered referrer rewards, and strict one-discount selection. Record attempts, selections, declines, rejections, redemptions, reversals, and final cents. This step produces the authoritative amount that Step 8 will send to Stripe.

For ONE45, trusted validation must prove the customer is genuinely new and has never successfully redeemed it. A returning or established customer must receive the normal One-Time price even if the code is entered again. ONE45 must not be rejected for expiration because it has no expiration date.

Referral tests must prove the referred customer receives the approved 50% first-cleaning discount, the referrer’s first qualified reward is 50%, later qualified rewards are 25%, and rewards apply one per invoice without stacking.

**DONE when:** browser-submitted prices cannot alter the trusted total and automated tests cover every valid, invalid, reused, established-customer, wrong-plan, wrong-bin-count, duplicate-address, tier, and stacking combination. Stripe is not required to complete these pricing-rule tests.

## Step 7 — Create the account and connected customer records

**Status: WAITING**

Idempotently create Auth identity, customer, contact preferences, current address/history, bins and streams, pickup/cleaning schedule, pending subscription or one-time order, pending payment/signup status, permanent referral code, and CRM/audit activity. Account creation alone does not activate service.

**DONE when:** retries cannot create duplicates and the pending account appears correctly in CRM and customer login boundaries.

## Step 8 — Connect Stripe test checkout and tax

**Status: WAITING**

This is the first step that actually opens Stripe Checkout. Configure Stripe test credentials privately, then create Stripe test Checkout from the trusted Step 6 calculation and connected Step 7 records. Support anniversary billing and one-time purchases, pass exactly one approved discount and validated tax address, keep card data inside Stripe, and provide safe success/cancel returns.

**DONE when:** the Stripe test amount exactly matches the trusted application calculation and a fictional customer can pay or cancel without corrupting records.

## Step 9 — Process Stripe webhooks and activate the account

**Status: WAITING**

Verify signed, idempotent webhooks for checkout, payment success/failure, recurring invoices, subscription changes/cancellation, and required refund/dispute events. Successful initial payment activates the correct account/order, creates the paid cycle and one entitlement, records discount/referral attribution, opens the portal, and updates CRM/scheduling.

**DONE when:** webhook replay cannot duplicate charges, subscriptions, cycles, entitlements, redemptions, referral credits, or activations.

## Step 10 — Finish the customer portal

**Status: WAITING**

Show account/payment/service state; plan, paid bin count, total recurring price, anniversary, next bill; pickup/recycling/cleaning/next service; return/access/safety; next-visit bin flags; service photos/history; referral code, short link, qualification status, tier, queued rewards, and credit; contact preferences; protected change requests; Stripe billing portal; and grace/suspension messaging while preserving access.

**DONE when:** a fictional paid customer completes every approved self-service action without directly changing protected CRM, route, pricing, or billing fields.

## Step 11 — Finish the internal CRM

**Status: WAITING**

Provide leads, abandoned signups, pending payments, active/suspended/canceled customers; full search/filtering; complete customer operational and financial history; staff-assisted signup using the same services; address/recycling/referral review queues; and role-protected admin/dispatcher/technician access.

**DONE when:** staff can understand any fictional customer’s complete state without manually opening Stripe, raw Supabase tables, or source code.

## Step 12 — Implement payment failure, grace period, suspension, and reactivation

**Status: WAITING**

Start the seven-day grace period on recurring failure, preserve portal access, display/send approved notices, hold route service, suspend after the deadline, preserve history/anniversary, and reactivate after payment for the next normal route day without a special trip.

**DONE when:** automated time and webhook tests prove each status, route hold, notice, suspension, and recovery transition.

## Step 13 — Finish route scheduling and holiday adjustments

**Status: WAITING**

Build route queues from cleaning day, municipality/zone, capacity, account/payment state, service alignment, and entitlement eligibility. Shift pickup and cleaning for holidays; support dispatcher assignment/resequencing; exclude unpaid, canceled, suspended, ineligible, staff-review, or consumed entitlements.

**DONE when:** the system produces a correct test route and every included or excluded stop has an auditable reason.

## Step 14 — Finish the field-service workflow

**Status: WAITING**

Provide assigned routes/stops, navigation, bin stream and next-visit flags, access/gate/animal/safety/return instructions, before photo, cleaning confirmation, return confirmation or owner-approved exception, after photo, and completion/problem statuses with launch-appropriate error handling.

**DONE when:** a technician completes a fictional route on a phone and portal, CRM, entitlement, audit, photo, and route records all update correctly.

## Step 15 — Complete customer notifications, referral email, and photo delivery

**Status: WAITING — formatted HTML referral email intentionally deferred here**

Complete the notification system for approved test email/SMS covering pending payment, confirmation, preparation, delay/exception, completion with secure photos, payment failure/grace/suspension/reactivation, referral invitation, referral qualification, and reward issuance.

Referral invitation requirements:

- Keep SMS concise and use the branded short path `acleanbin.com/r/ADS-XXXX-XXXX` because SMS cannot hide a link behind words.
- Replace the current staging `mailto:` placeholder with a server-sent formatted HTML email.
- Use a transactional email provider after setup and domain verification. Current planned provider: Resend.
- Verify `acleanbin.com` through Porkbun DNS before production sending.
- Send from an approved ADS address such as `referrals@acleanbin.com`.
- Display **Clean My Bins** as blue clickable words with the referral URL embedded behind them; do not show the long raw URL in the normal HTML email.
- The embedded link must open the short referral route and automatically carry the sender’s referral code into signup.
- Include a plain-text fallback using the short link.
- Authenticate the sender, look up the referral code server-side, rate-limit invitations, prevent abuse, record delivery status, honor suppression/opt-out requirements, and update privacy wording because ADS and the email provider will process the recipient address.

All notifications must respect contact permissions, use secure customer-specific links, and create an auditable delivery record without exposing one customer’s information to another.

**DONE when:** each event sends the correct notification once; secure photos and referral links work; the HTML referral email displays a clickable **Clean My Bins** link without the raw URL; SMS remains concise; and no cross-customer exposure occurs.

## Step 16 — Finish public website content, policies, and campaign tracking

**Status: WAITING**

Replace remaining bin-photo placeholders with approved original ADS photos; finalize copy, prices, inclusions, FAQs, preparation/prohibited-material rules, terms/privacy/recurring authorization/cancellation/promotion/referral consent; keep the normal One-Time catalog price visible while presenting ONE45 clearly as a new-customer promotion with no expiration; disclose referral-email processing appropriately; track QR/deep-link campaigns; preserve Lavo separation.

**DONE when:** every public statement matches approved rules and customers can understand service, regular price, promotion eligibility, one-use limit, no-expiration rule, referral terms, communication practices, obligations, and signup before paying.

## Step 17 — Run complete end-to-end acceptance testing

**Status: WAITING**

Test all devices and major flows: Monthly without code; `NEW25`; valid/invalid referral; first and later referrer reward tiers; attempted stacking; short referral redirect; HTML referral email and concise SMS; `ONE45` for a new customer; attempted second ONE45 use by the same customer; established-customer ONE45 rejection; duplicate-account/address abuse; Quarterly; Twice a Year; normal One-Time; abandoned/failed checkout; successful payment and webhook replay; portal/CRM/routes/field/photos/notifications; failed recurring payment through recovery; roles, isolation, accessibility, privacy, audit, backups, and recovery.

**DONE when:** all launch blockers pass, serious defects are corrected, and James completes an owner acceptance walkthrough with fictional data.

## Step 18 — Production setup, final approval, and controlled launch

**Status: WAITING**

Only after Step 17: configure production Supabase/backups, Stripe live products/prices/promotions/webhooks, production email/SMS/address/tax/monitoring/analytics, Resend production sending and Porkbun DNS verification, `www.acleanbin.com`, HTTPS, redirects, and final QR destinations. Do not migrate fictional customers. Run a private smoke test and obtain explicit owner approval before activation. Begin with a controlled soft launch.

**DONE when:** James explicitly approves activation, the first controlled real signup completes from advertisement through paid service record, and monitoring shows no unresolved launch blocker.

---

## Current next action

Finish **Step 3** staging verification and keep Stripe disabled. Then begin **Step 4** by turning the signup preview into a working fictional-data signup that saves incomplete, abandoned, and submitted-but-unpaid records to CRM.

The formatted blue clickable **Clean My Bins** referral email is deliberately parked in **Step 15** and should not delay signup, pricing, payment, account, routing, or field-work development.
