# ADS Bin Cleaning authoritative launch configuration

**Owner:** James Gibbs  
**Effective date:** 2026-08-05  
**Configuration version:** `2026-08-05-launch-rules-v5`  
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
- General website price chart: normal One-Time pricing remains $60 for up to two bins; ONE45 is presented as a new-customer promotion rather than a replacement price.
- Eligible purchase: One-Time Cleaning with exactly two bins.
- Promotional subtotal: $45 before tax.
- Normal subtotal: $60 before tax.
- Discount: $15.
- Customer eligibility: genuinely new ADS Bin Cleaning customer only.
- Established customers are not eligible, including six months or a year later.
- Usage limit: one successful redemption per customer. A service-address history check remains an anti-abuse safeguard against duplicate accounts.
- Expiration: **none**. ONE45 has no expiration date.
- Stacking: cannot combine with `NEW25`, a referral discount, or any other promotion.
- Matching: customer entry is case-insensitive; the stored and displayed normalized value is `ONE45`.
- Validation: the browser may preview the code, but final plan, bin count, customer/address history, prior use, tax basis, and cents must be revalidated by the trusted checkout service.
- Future One-Time purchases by that customer use the regular catalog price.

## 5. Referral program

- Eligible Monthly residential subscriptions receive one permanent referral code after the customer account becomes active.
- Every qualifying referred new customer receives 50% off the eligible base price of their first Monthly cleaning. Additional-bin charges, taxes, add-ons, and specialty charges remain at their normal price.
- The referring customer’s **first lifetime qualified referral** earns 50% off one next eligible Monthly base cleaning.
- The referring customer’s **second and every later qualified referral** earns 25% off one next eligible Monthly base cleaning.
- There is no hard limit on legitimate referral count.
- Only one earned referral reward may apply to an invoice. Earned referral rewards do not stack together on the same invoice and cannot make a Monthly base cleaning free.
- Rewards are queued in qualification order and apply to separate eligible Monthly invoices.
- A referral becomes qualified only after the referred customer’s eligible first service is completed, payment is settled, the account remains in good standing, and the seven-day review hold passes.
- Reversed, fraudulent, duplicate-account, self-referral, refunded, or chargeback referrals do not count toward the referrer’s qualified-referral tier.
- Earned rewards expire 12 months after issuance.
- The new-customer referral discount cannot stack with `NEW25`, `ONE45`, or another promotion.
- ADS may pause or modify the program for future referrals. Qualified rewards already earned remain valid under the terms in effect when earned, subject to expiration, fraud, refund, and reversal rules.

### Referral examples at the launch Monthly price

- One-bin customer, first qualified referral: $20 base becomes $10 for one invoice.
- One-bin customer, later qualified referral: $20 base becomes $15 for one invoice.
- Two-bin customer, first qualified referral: $20 base becomes $10, plus the regular $5 second-bin charge, for a $15 subtotal before tax.
- Two-bin customer, later qualified referral: $20 base becomes $15, plus the regular $5 second-bin charge, for a $20 subtotal before tax.

## 6. Service scheduling and bin return

- Trash pickup day, recycling pickup schedule, and ADS cleaning day are separate values.
- Each enrolled bin is identified as trash, recycling, or other.
- Trash-only service is normally cleaned on the next calendar day after an eligible trash collection.
- Any service that includes a recycling cart is aligned to the next verified recycling collection so the trash and recycling carts are expected to be empty and available together.
- Because recycling may be collected every other week, a customer who signs up before a non-recycling trash week waits until the next eligible recycling week. The first cleaning may therefore occur later than the next trash pickup.
- Signup must collect the recycling weekday, frequency, and an actual next or recent recycling collection date. The date anchors which alternating week is the recycling week; weekday alone is insufficient.
- If trash and recycling are collected on different weekdays, or the recycling schedule cannot be verified, the signup requires staff review instead of automatic route assignment.
- The ADS cleaning day remains the next calendar day after the eligible collection date.
- A holiday collection shift moves the ADS cleaning day to the next calendar day after the adjusted eligible collection date.
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
