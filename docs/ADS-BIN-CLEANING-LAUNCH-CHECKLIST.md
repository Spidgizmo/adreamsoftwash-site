# ADS Bin Cleaning master launch checklist

Owner: James Gibbs  
System: ADS Bin Cleaning at `www.acleanbin.com`  
Purpose: one permanent, numbered path from the current test foundation to a controlled public launch.

## How this checklist is used

- These step numbers are permanent. Do not renumber them. Add substeps when more detail is needed.
- James can ask, for example, “Is Step 10 done?” and the answer must be based on the acceptance test written under that step.
- Status values are: **NEXT**, **IN PROGRESS**, **BLOCKED**, **READY FOR OWNER TEST**, or **DONE**.
- No step is marked **DONE** merely because a screen exists. Its stated acceptance test must pass.
- No live payments, production deployment, or public signup may be activated without James Gibbs’s explicit approval.
- The existing Lavo exterior-cleaning flow remains separate and unchanged.

## Current starting point

The responsive public-page preview, signup preview, Supabase data model, authentication and role security, permanent referral-code provisioning, test customer portal, test CRM, and test field foundation already exist. The missing center is the live test-mode chain from real signup information through payment, portal activation, CRM visibility, scheduling, and service completion.

---

## Step 1 — Lock the launch rules and campaign handling

**Status: NEXT**

Write one final launch configuration used by the website, signup, CRM, Stripe, portal, and reporting. It must include:

- Launch plans and permanent prices: Monthly, Quarterly, Twice a Year, and One-Time Cleaning.
- `NEW25`: new Monthly subscribers only; 25% off the first Monthly charge.
- Referral offer: eligible Monthly residential signup only.
- Promo and referral discounts never stack.
- Every customer receives one permanent unique referral code.
- Trash pickup day and ADS cleaning day are separate; normal cleaning day is the next calendar day after collection, with holiday adjustments.
- Cleaned bins are returned to the customer’s designated storage location.
- Failed recurring payment receives a seven-calendar-day grace period before service suspension; successful payment restores the account for the next normal route day, not a special trip.
- The **$45 two-bin one-time special is a card-only campaign offer and is not displayed as a general website price**.
- Define the exact private redemption method, expiration, usage limit, and non-stacking rule for that card-only offer before coding it.

**DONE when:** every rule is recorded in the decision log and the same configuration can be referenced by every later step without conflicting prices or policies.

## Step 2 — Create the hosted test environment

**Status: WAITING**

Create a hosted staging environment using fictional/test data only:

- Hosted Supabase test project.
- Staging web deployment on a private or clearly labeled test address.
- Separate development, staging, and future production configuration.
- Database migrations and seed process run successfully in the hosted test project.
- No real customer information and no live payment credentials.

**DONE when:** James can open the staging website from a phone or computer and the application is using the hosted test database rather than only the disposable local test stack.

## Step 3 — Configure secure test integrations

**Status: WAITING**

Configure and protect the services needed by the connected signup flow:

- Supabase public and trusted server credentials.
- Stripe test-mode account, products, prices, coupons/promotions, and webhook secret.
- Replaceable address-validation and tax-provider test configuration.
- Email/SMS test provider or safe notification simulator.
- Secure environment variables with no secrets committed to GitHub.

**DONE when:** the staging application can securely contact every required test service and automated checks prove secrets are not exposed to the browser or repository.

## Step 4 — Turn the signup preview into a working test signup

**Status: WAITING**

Enable the complete responsive signup form in the approved order:

1. How service works.
2. Address and service eligibility.
3. Trash and recycling pickup information.
4. Bin count.
5. Plan and price.
6. Promo code or referral code.
7. Account creation information.
8. Return location, access instructions, animal/gate warnings, and contact preferences.
9. Terms and authorization.
10. Continue to Stripe test checkout.

The form must save progress safely and create a visible pending signup/lead in the CRM even when payment is not completed.

**DONE when:** a fictional customer can submit every required field on phone and desktop, validation errors are clear, and an incomplete or unpaid signup appears correctly in the CRM.

## Step 5 — Validate address, service eligibility, and collection schedule

**Status: WAITING**

- Normalize and validate the exact service address.
- Confirm whether the address is inside the approved service area.
- Resolve or collect the official trash pickup day and recycling information.
- Store the source and confidence of the pickup-day result.
- Calculate normal ADS cleaning day as pickup day plus one calendar day.
- Support staff review when the automated result is uncertain or conflicts with customer information.
- Preserve address history for referral and fraud safeguards.

**DONE when:** a test address receives an auditable eligibility decision, pickup day, cleaning day, and review state, and uncertain addresses cannot silently enter the route.

## Step 6 — Build trusted pricing and discount validation

**Status: WAITING**

Move final calculations to the trusted server/database boundary:

- Use the central plan catalog for all prices.
- Calculate bin charges and tax basis in cents.
- Verify `NEW25` eligibility and first-cycle-only use.
- Verify referral code existence, owner, active status, self-referral protection, address-history protection, Monthly eligibility, and new-customer eligibility.
- Allow one promo or one referral discount, never both.
- Support the private card-only offer only through its approved campaign rule; do not display it as the ordinary website one-time price.
- Record attempted, selected, declined, rejected, and redeemed discount states.

**DONE when:** browser values cannot change the trusted total, all conflicting/invalid offers fail closed, and automated tests cover every approved discount combination.

## Step 7 — Create the account and connected customer records

**Status: WAITING**

Before Stripe checkout, create the connected pending records safely and idempotently:

- Supabase Auth identity.
- Customer and contact preferences.
- Current service address and address history.
- Bins.
- Pickup schedule and cleaning-day assignment.
- Pending subscription or one-time order.
- Pending payment/signup status.
- Permanent unique referral code.
- CRM activity/audit record.

The customer is not active or entitled to service merely because an account exists.

**DONE when:** retrying the same signup does not create duplicate customers, addresses, subscriptions, orders, or referral codes, and the pending account is visible in both CRM and customer login boundaries.

## Step 8 — Connect Stripe test checkout and tax

**Status: WAITING**

- Create the correct Stripe test Checkout Session from trusted server calculations.
- Use anniversary billing for recurring plans.
- Map the selected plan, bin count, one allowed discount, and validated tax address.
- Keep card data entirely inside Stripe.
- Support recurring plans and one-time orders as separate billing types.
- Provide safe cancel and success return URLs.

**DONE when:** a fictional customer can reach Stripe test checkout with exactly the same amount shown by the trusted application calculation, complete payment with a Stripe test card, or cancel without corrupting the signup.

## Step 9 — Process Stripe webhooks and activate the account

**Status: WAITING**

Build signed, idempotent webhook processing for at least:

- Checkout completed.
- Initial payment succeeded or failed.
- Recurring invoice payment succeeded or failed.
- Subscription updated or canceled.
- Refund/dispute events needed for status and discount integrity.

After successful initial payment:

- Activate the correct customer/subscription or one-time order.
- Create the paid service cycle and exactly one cleaning entitlement.
- Preserve the billing anniversary.
- Record the selected promotion/referral attribution.
- Send the customer directly to the portal or sign them in automatically.
- Make the active customer immediately visible in CRM and scheduling queues.

**DONE when:** replaying a webhook cannot create duplicate charges, subscriptions, paid cycles, entitlements, credits, or activations.

## Step 10 — Finish the customer portal

**Status: WAITING**

The production-ready portal must show and manage:

- Account and payment/service status.
- Current plan, bin count, price, billing anniversary, and next billing date.
- Pickup day, normal cleaning day, and next scheduled service.
- Designated return location and access/safety instructions.
- “Dirty this visit” bin flags.
- Service history with customer-visible before/after photos.
- Permanent referral code, share link, referral status, and earned credit.
- Contact preferences and safe change-request forms.
- Stripe billing-portal access for payment-method and subscription actions allowed by policy.
- Clear grace-period or suspended-service messaging without blocking portal access.

**DONE when:** a fictional paid customer can complete every approved self-service action without changing protected CRM, route, pricing, or billing fields directly.

## Step 11 — Finish the internal CRM

**Status: WAITING**

The minimum launch CRM must provide:

- Leads, abandoned signups, pending payments, active customers, suspended customers, and canceled customers.
- Search and filters by name, address, municipality, plan, pickup day, cleaning day, route state, payment state, and account state.
- Full customer detail with plan, bins, pricing, discounts, referral attribution, billing, schedule, access, safety, notes, changes, photos, and audit history.
- Staff-assisted signup using the same trusted signup/pricing services as the website.
- Review queues for uncertain pickup data, address conflicts, customer change requests, exceptions, and referral issues.
- Role-protected administrator, dispatcher, and field-technician access.

**DONE when:** staff can locate and understand any fictional customer’s complete operational state without checking Stripe, Supabase tables, or source code manually.

## Step 12 — Implement payment failure, grace period, suspension, and reactivation

**Status: WAITING**

- Start the seven-calendar-day grace period after a failed recurring payment.
- Keep portal access available.
- Show payment status in CRM and portal.
- Send approved notices.
- Prevent unpaid service from entering or remaining on active routes after the deadline.
- Suspend service without deleting the customer, history, or billing anniversary.
- Reactivate automatically after successful payment and return the customer to the next normal eligible route day.
- Never create a special recovery trip.

**DONE when:** automated time-based and webhook tests prove every status transition, route hold, notice, and recovery path.

## Step 13 — Finish route scheduling and holiday adjustments

**Status: WAITING**

- Build route queues from cleaning day, municipality/zone, and account/entitlement eligibility.
- Apply holiday collection shifts to both pickup and cleaning days.
- Support multiple route runs or crews without changing customer billing rules.
- Allow dispatcher review, assignment, resequencing, and documented exceptions.
- Prevent suspended, unpaid, canceled, ineligible, or already-consumed entitlements from being routed.
- Preserve one completion per paid entitlement.

**DONE when:** the system can produce a correct test route for a selected day and every included/excluded stop has an auditable reason.

## Step 14 — Finish the field-service workflow

**Status: WAITING**

The phone/tablet field screen must provide:

- Assigned route and ordered stops.
- Address/navigation handoff.
- Bin count and dirty-bin flags.
- Access, gate, animal, safety, and return-location instructions.
- Required before photo.
- Cleaning confirmation.
- Required bin-return confirmation or owner-approved exception.
- Required after photo.
- Completion, skipped, refused, or problem status with notes.
- Offline/error-safe behavior appropriate for launch.

**DONE when:** a technician can complete an entire fictional route on a phone and the portal, CRM, entitlement, audit, and route records all update correctly.

## Step 15 — Complete customer notifications and photo delivery

**Status: WAITING**

Add approved email/SMS messages for:

- Account created/pending payment.
- Payment and signup confirmation.
- Upcoming service and bin-preparation reminder.
- Route/service delay or exception when needed.
- Cleaning completed with secure before/after photo links.
- Payment failure, grace deadline, suspension, and reactivation.
- Referral qualification and credit issuance.

Respect saved contact permissions and retain delivery/audit status.

**DONE when:** every required event produces the correct test notification once, with secure customer-specific links and no cross-customer photo exposure.

## Step 16 — Finish public website content, policies, and campaign tracking

**Status: WAITING**

- Replace placeholders with approved original ADS photographs when available.
- Finalize concise marketing copy, pricing, service inclusions, FAQs, and preparation/prohibited-material rules.
- Publish terms, privacy notice, recurring-payment authorization, cancellation policy, promotion/referral terms, and required consent language.
- Keep the card-only $45 offer out of the general public price chart while allowing its approved private redemption path.
- Connect marketing QR/deep links to campaign tracking without creating a second pricing system.
- Keep all bin-cleaning actions separate from the Lavo exterior-cleaning quote flow.

**DONE when:** every public statement matches the approved rules and a customer can understand the service, price, obligations, and signup path before paying.

## Step 17 — Run complete end-to-end acceptance testing

**Status: WAITING**

Test the hosted system across phones, tablets, laptops, and desktops, including:

- New Monthly signup with no code.
- `NEW25` signup.
- Valid and invalid referral signup.
- Attempted promo/referral stacking.
- Approved private card-offer redemption.
- Quarterly, Twice a Year, and normal One-Time signup.
- Abandoned and failed checkout.
- Successful payment and duplicate webhook replay.
- Portal, CRM, route, field completion, photos, and notifications.
- Failed recurring payment through grace, suspension, and reactivation.
- Role security, customer isolation, accessibility, privacy, audit history, backups, and recovery.

**DONE when:** all launch-blocking tests pass, all serious defects are corrected, and James completes an owner acceptance walkthrough using fictional data.

## Step 18 — Production setup, final approval, and controlled launch

**Status: WAITING**

Only after Step 17 is done:

- Create or validate the production Supabase project and backups.
- Configure Stripe live products/prices/promotions and signed live webhooks.
- Configure production email/SMS, address/tax services, monitoring, error alerts, and analytics.
- Connect `www.acleanbin.com`, HTTPS, redirects, and final QR destinations.
- Migrate no fictional/test customers into production.
- Run a final production smoke test without exposing broad public signup.
- Obtain explicit James Gibbs approval to activate live payments and public signup.
- Start with a controlled soft launch, verify the first real customers end to end, and then expand marketing.

**DONE when:** James explicitly approves activation, the first controlled real signup completes correctly from advertisement through paid service record, and monitoring shows no unresolved launch-blocking issue.

---

## Current next action

Begin **Step 1**. After Step 1 is locked and documented, proceed directly to **Step 2: hosted test environment**. Do not jump to live Stripe or public signup before the intervening steps pass.