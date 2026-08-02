# ADS Bin Cleaning MVP

## Purpose and boundaries

The MVP adds a dedicated ADS Bin Cleaning page to the existing American Dream Softwash website. The existing website and live customer flow must remain preserved. This document records approved requirements; it does not authorize deployment or replacement of any existing behavior.

## Service and pricing

- Monthly service costs **$20 for the first bin and $5 for each additional bin**.
- Billing uses the signup-date anniversary: charge at signup and renew on the same calendar date each month.
- The customer enters a service address and confirms the normal trash pickup day.
- ADS cleans on the following calendar day:

| Normal trash pickup | ADS cleaning |
| --- | --- |
| Monday | Tuesday |
| Tuesday | Wednesday |
| Wednesday | Thursday |
| Thursday | Friday |
| Friday | Saturday |

- A holiday delay to trash collection also delays ADS cleaning to the following day.
- The customer selects a designated bin-return location and provides access instructions.
- After cleaning, ADS returns the bins to the designated location.

## Signup, payment, and account creation

- Create the customer account and portal during signup.
- Process signup payment with Stripe. Stripe must remain in test mode until live activation receives separate approval.
- After successful Stripe payment, send the customer directly into the portal.
- Generate a permanent unique referral code immediately.

## Customer portal

The portal must enforce customer-level isolation so each customer sees only their own records. It displays:

- plan;
- bin count;
- service address;
- normal trash pickup day;
- ADS cleaning day;
- designated return location and access/return instructions;
- requests;
- Stripe billing access;
- permanent referral code and share link; and
- pending rewards, available rewards, and reward history.

## Internal CRM and schedule verification

Every signup must be sent to the initial internal CRM. Administrator-only actions must be protected. The CRM displays:

- customer;
- service address;
- bin count;
- pickup day;
- cleaning day;
- route family;
- payment status;
- referral information; and
- schedule-verification status.

Store the official collection-zone registry and the customer-confirmed pickup day as separate data. Compare the two values. Any disagreement must enter staff review rather than being silently assigned.

## Extensibility for later phases

The following are explicitly later phases and are not part of the MVP implementation:

- a full Flex-style routing application;
- optimized stop ordering;
- before/after photos;
- completion text messages;
- gratuities; and
- municipal automation.

The MVP database design must nevertheless support adding these capabilities later without discarding the core customer, service, schedule, route, billing, referral, and service-history records.

## Approval boundary

This specification does not authorize agents to invent missing details. Open business-rule and implementation decisions are tracked in [DECISION-LOG.md](./DECISION-LOG.md). James Gibbs is the owner and final decision-maker, and deployment, merging, and Stripe live activation require separate approval.
