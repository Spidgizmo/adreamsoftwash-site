# ADS Bin Cleaning authoritative launch configuration

**Owner:** James Gibbs  
**Effective date:** 2026-08-04  
**Configuration version:** `2026-08-04-launch-rules-v2`  
**System:** ADS Bin Cleaning at `www.acleanbin.com`

This is the single owner-approved launch-rule reference for the website, signup, CRM, Stripe configuration, portal, reporting, scheduling, and tests. Code mirrors these rules in `src/lib/bin-cleaning-launch-config.ts`. Service-plan prices remain sourced only from the versioned central plan catalog.

## 1. Launch plans and permanent public pricing

- Monthly: $20 first bin and $5 each additional bin.
- Quarterly: $35 first bin and $5 each additional bin.
- Twice a Year: $50 includes up to two bins and $10 each additional bin after two.
- One-Time Cleaning: $60 includes up to two bins and $10 each additional bin after two.
- Every 2 Weeks remains future/inactive with no approved price or launch checkout.

## 2. Discount selection rule

A signup or checkout may use only one discount source:

- one promotional code; or
- one eligible referral code.

Promotions and referrals never stack. Two promotions never stack. The selected, declined, rejected, and redeemed states must be recorded at the trusted server/database boundary.

## 3. Public promotion — NEW25

- Code: `NEW25`.
- Publicly advertised on the website.
- New Monthly subscribers only.
- 25% off the selected first Monthly subtotal before tax.
- First paid cycle only; later renewals return to normal price.
- One successful redemption per customer.
- Not valid on Quarterly, Twice a Year, One-Time Cleaning, or inactive plans.
- Not stackable with a referral or another promotion.

## 4. Public promotion — ONE45

The exact promo code is **`ONE45`**: the letters `O-N-E`, followed by the digits `4-5`. It is not the number `145`.

- Campaign: publicly advertised two-bin One-Time new-customer special.
- Redemption method: customer enters `ONE45` in the promotional-code field during signup or before payment.
- General website price chart: normal One-Time pricing remains $60 for up to two bins; ONE45 is presented as a limited new-customer promotion rather than a replacement price.
- Eligible purchase: One-Time Cleaning with exactly two bins.
- Promotional subtotal: $45 before tax.
- Normal subtotal: $60 before tax.
- Discount: $15.
- Customer eligibility: genuinely new ADS Bin Cleaning customer only.
- Established customers are not eligible, including six months or a year later.
- Usage limit: one successful redemption per customer. A service-address history check remains an anti-abuse safeguard against duplicate accounts.
- Redemption deadline: through September 1, 2026, using the `America/New_York` business time zone.
- Stacking: cannot combine with `NEW25`, a referral discount, or any other promotion.
- Matching: customer entry is case-insensitive; the stored and displayed normalized value is `ONE45`.
- Validation: the browser may preview the code, but final plan, bin count, customer/address history, deadline, usage, tax basis, and cents must be revalidated by the trusted checkout service.
- Future One-Time purchases by that customer use the regular catalog price.

## 5. Referral program

- **Share 50%. Get 50%.** applies to eligible Monthly residential subscriptions only.
- The new customer receives 50% off the eligible first Monthly base cleaning.
- The referrer earns 50% off their own next eligible Monthly base cleaning after the referred cleaning is paid, completed, in good standing, and past the seven-day review hold.
- Every customer receives one permanent unique referral code.
- The new-customer referral discount cannot stack with `NEW25`, `ONE45`, or another promotion.

## 6. Service scheduling and bin return

- Trash pickup day and ADS cleaning day are separate values.
- Normal ADS cleaning day is the next calendar day after collection.
- A holiday collection shift moves the ADS cleaning day to the next calendar day after the adjusted collection date.
- Cleaned bins are returned to the customer’s designated storage location as part of standard service.

## 7. Failed recurring payment

- A failed recurring payment starts a seven-calendar-day grace period and service hold.
- Portal and billing access remain available.
- If payment remains unpaid after the deadline, service is suspended without deleting the customer or history.
- A successful later payment restores eligibility for the next normal route day.
- No special recovery trip is created, and the billing anniversary is not changed.

## 8. Release controls

- Stripe remains in test mode until James Gibbs explicitly approves live activation.
- Live signup remains disabled until accounts, portal, Stripe test billing, and minimum CRM connectivity pass together.
- Production deployment and public payment activation require separate explicit owner approval.
- ADS Bin Cleaning remains separate from the existing Lavo exterior-cleaning flow.
