# ADS Bin Cleaning master launch checklist

Owner: James Gibbs  
System: ADS Bin Cleaning at `www.acleanbin.com`  
Purpose: one permanent, numbered path from the current test foundation to a controlled public launch.

## How this checklist is used

- Step numbers are permanent and must not be renumbered.
- James can ask, for example, “Is Step 10 done?” and the answer must use that step’s written acceptance test.
- Status values are **NEXT**, **IN PROGRESS**, **BLOCKED**, **READY FOR OWNER TEST**, **DONE**, or **WAITING**.
- A screen existing does not make a step done; the acceptance test must pass.
- Live payments, production deployment, and public signup require James Gibbs’s explicit approval.
- The existing Lavo exterior-cleaning flow remains separate and unchanged.
- The authoritative owner-approved launch rules are in `docs/ADS-BIN-CLEANING-LAUNCH-CONFIG.md` and mirrored in `src/lib/bin-cleaning-launch-config.ts`.

## Current starting point

The responsive public-page preview, signup preview, Supabase data model, authentication and role security, permanent referral-code provisioning, test portal, test CRM, and test field foundation exist. The missing center is the hosted test-mode chain from submitted signup information through payment, portal activation, CRM visibility, scheduling, and service completion.

---

## Step 1 — Lock the launch rules and campaign handling

**Status: DONE — completed 2026-08-04**

The locked configuration includes:

- Monthly, Quarterly, Twice a Year, and One-Time permanent catalog prices.
- `NEW25`: publicly advertised, new Monthly subscribers only, 25% off the first Monthly charge.
- `ONE45`: private card code; exact spelling is `O-N-E-4-5`; One-Time Cleaning with exactly two bins for $45 before tax instead of the normal $60.
- `ONE45` is new-customer only, one successful use per customer and service address, redeemable through September 1, 2026 in `America/New_York`, and not displayed as the general website price.
- Referral offer: eligible Monthly residential signup only.
- Only one discount source per checkout; promo/promo and promo/referral stacking are prohibited.
- Every customer receives one permanent unique referral code.
- Normal ADS cleaning day is the next calendar day after trash collection, including holiday shifts.
- Cleaned bins are returned to the designated storage location.
- Failed recurring payment uses a seven-calendar-day grace period; portal remains accessible; recovery returns the customer to the next normal eligible route day without a special trip.

**Acceptance result:** passed. The decision log, authoritative launch configuration, and code configuration agree at version `2026-08-04-launch-rules-v1`.

## Step 2 — Create the hosted test environment

**Status: NEXT**

Create a hosted staging environment using fictional/test data only:

- Hosted Supabase test project.
- Private or clearly labeled staging web deployment.
- Separate development, staging, and future production configuration.
- Database migrations and fictional seed run successfully in hosted Supabase.
- No real customer information and no live payment credentials.

**DONE when:** James can open the staging website from a phone and computer, sign in with fictional test accounts, and confirm the app is using the hosted test database rather than only the disposable local stack.

## Step 3 — Configure secure test integrations

**Status: WAITING**

Configure protected test credentials for Supabase, Stripe test mode, address validation, tax calculation, and test email/SMS or a safe simulator. No secret may be committed or exposed to the browser.

**DONE when:** staging securely reaches every required test service and automated checks prove protected credentials are not exposed.

## Step 4 — Turn the signup preview into a working test signup

**Status: WAITING**

Enable the responsive form in this order: service explanation; address/eligibility; trash/recycling schedule; bin count; plan/price; promo or referral; account details; return/access/safety/contact details; terms; Stripe test checkout. Save incomplete and unpaid signups to CRM.

**DONE when:** a fictional customer can submit required information on phone and desktop, clear validation is shown, and an abandoned or pending-payment signup appears in CRM.

## Step 5 — Validate address, service eligibility, and collection schedule

**Status: WAITING**

Normalize the exact address, decide service-area eligibility, obtain or collect trash/recycling schedule data, record source/confidence, calculate pickup-plus-one-day cleaning, preserve address history, and create staff review when uncertain.

**DONE when:** each test address has an auditable eligibility, pickup, cleaning-day, and review result, and uncertain addresses cannot silently enter routes.

## Step 6 — Build trusted pricing and discount validation

**Status: WAITING**

Move final pricing to the trusted server/database boundary. Validate catalog price, bin charges, tax basis, `NEW25`, `ONE45`, referral eligibility, customer/address history, deadlines, redemption limits, and strict one-discount selection. Record attempts, selections, declines, rejections, redemptions, reversals, and final cents.

**DONE when:** browser-submitted prices cannot alter the trusted total and automated tests cover every valid, invalid, expired, reused, wrong-plan, wrong-bin-count, and stacking combination.

## Step 7 — Create the account and connected customer records

**Status: WAITING**

Idempotently create Auth identity, customer, contact preferences, current address/history, bins, pickup/cleaning schedule, pending subscription or one-time order, pending payment/signup status, permanent referral code, and CRM/audit activity. Account creation alone does not activate service.

**DONE when:** retries cannot create duplicates and the pending account appears correctly in CRM and customer login boundaries.

## Step 8 — Connect Stripe test checkout and tax

**Status: WAITING**

Create Stripe test Checkout from trusted calculations, support anniversary billing and one-time purchases, pass exactly one approved discount and validated tax address, keep card data inside Stripe, and provide safe success/cancel returns.

**DONE when:** the Stripe test amount exactly matches the trusted application calculation and a fictional customer can pay or cancel without corrupting records.

## Step 9 — Process Stripe webhooks and activate the account

**Status: WAITING**

Verify signed, idempotent webhooks for checkout, payment success/failure, recurring invoices, subscription changes/cancellation, and required refund/dispute events. Successful initial payment activates the correct account/order, creates the paid cycle and one entitlement, records discount/referral attribution, opens the portal, and updates CRM/scheduling.

**DONE when:** webhook replay cannot duplicate charges, subscriptions, cycles, entitlements, redemptions, referral credits, or activations.

## Step 10 — Finish the customer portal

**Status: WAITING**

Show account/payment/service state; plan, bins, price, anniversary, next bill; pickup/cleaning/next service; return/access/safety; dirty-bin flags; service photos/history; referral code/link/status/credit; contact preferences; protected change requests; Stripe billing portal; and grace/suspension messaging while preserving access.

**DONE when:** a fictional paid customer completes every approved self-service action without directly changing protected CRM, route, pricing, or billing fields.

## Step 11 — Finish the internal CRM

**Status: WAITING**

Provide leads, abandoned signups, pending payments, active/suspended/canceled customers; full search/filtering; complete customer operational and financial history; staff-assisted signup using the same services; review queues; and role-protected admin/dispatcher/technician access.

**DONE when:** staff can understand any fictional customer’s complete state without manually opening Stripe, raw Supabase tables, or source code.

## Step 12 — Implement payment failure, grace period, suspension, and reactivation

**Status: WAITING**

Start the seven-day grace period on recurring failure, preserve portal access, display/send approved notices, hold route service, suspend after the deadline, preserve history/anniversary, and reactivate after payment for the next normal route day without a special trip.

**DONE when:** automated time and webhook tests prove each status, route hold, notice, suspension, and recovery transition.

## Step 13 — Finish route scheduling and holiday adjustments

**Status: WAITING**

Build route queues from cleaning day, municipality/zone, capacity, account/payment state, and entitlement eligibility. Shift pickup and cleaning for holidays; support dispatcher assignment/resequencing; exclude unpaid, canceled, suspended, ineligible, or consumed entitlements.

**DONE when:** the system produces a correct test route and every included or excluded stop has an auditable reason.

## Step 14 — Finish the field-service workflow

**Status: WAITING**

Provide assigned routes/stops, navigation, bin/dirty flags, access/gate/animal/safety/return instructions, before photo, cleaning confirmation, return confirmation or owner-approved exception, after photo, and completion/problem statuses with launch-appropriate error handling.

**DONE when:** a technician completes a fictional route on a phone and portal, CRM, entitlement, audit, photo, and route records all update correctly.

## Step 15 — Complete customer notifications and photo delivery

**Status: WAITING**

Send approved test email/SMS for pending payment, confirmation, preparation, delay/exception, completion with secure photos, payment failure/grace/suspension/reactivation, and referral qualification/credit. Respect contact permissions and audit delivery.

**DONE when:** each event sends the correct notification once with secure customer-specific links and no cross-customer exposure.

## Step 16 — Finish public website content, policies, and campaign tracking

**Status: WAITING**

Replace placeholders with approved ADS photos; finalize copy, prices, inclusions, FAQs, preparation/prohibited-material rules, terms/privacy/recurring authorization/cancellation/promotion/referral consent; keep `ONE45` out of the public price chart while accepting it privately; track QR/deep-link campaigns; preserve Lavo separation.

**DONE when:** every public statement matches approved rules and customers can understand service, price, obligations, and signup before paying.

## Step 17 — Run complete end-to-end acceptance testing

**Status: WAITING**

Test all devices and major flows: Monthly without code; `NEW25`; valid/invalid referral; attempted stacking; `ONE45`; Quarterly; Twice a Year; normal One-Time; abandoned/failed checkout; successful payment and webhook replay; portal/CRM/routes/field/photos/notifications; failed recurring payment through recovery; roles, isolation, accessibility, privacy, audit, backups, and recovery.

**DONE when:** all launch blockers pass, serious defects are corrected, and James completes an owner acceptance walkthrough with fictional data.

## Step 18 — Production setup, final approval, and controlled launch

**Status: WAITING**

Only after Step 17: configure production Supabase/backups, Stripe live products/prices/promotions/webhooks, production communication/address/tax/monitoring/analytics, `www.acleanbin.com`, HTTPS, redirects, and final QR destinations. Do not migrate fictional customers. Run a private smoke test and obtain explicit owner approval before activation. Begin with a controlled soft launch.

**DONE when:** James explicitly approves activation, the first controlled real signup completes from advertisement through paid service record, and monitoring shows no unresolved launch blocker.

---

## Current next action

Begin **Step 2: Create the hosted test environment**. Do not activate live Stripe or public signup before Steps 2–17 pass.
