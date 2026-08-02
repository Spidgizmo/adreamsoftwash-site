# ADS Bin Cleaning Decision Log

James Gibbs is the owner and final decision-maker. Entries marked **Approved** are requirements to preserve. Entries marked **Owner decision required** must not be guessed or silently converted into business rules.

## Approved decisions

| ID | Status | Decision |
| --- | --- | --- |
| D-001 | Approved | Add a dedicated ADS Bin Cleaning page while preserving the existing American Dream Softwash website. |
| D-002 | Approved | Monthly pricing is $20 for the first bin plus $5 for each additional bin. |
| D-003 | Approved | Charge at signup and renew on the same calendar date each month. |
| D-004 | Approved | Collect the service address and customer-confirmed normal trash pickup day. |
| D-005 | Approved | Clean the following calendar day: Monday→Tuesday, Tuesday→Wednesday, Wednesday→Thursday, Thursday→Friday, and Friday→Saturday. |
| D-006 | Approved | A holiday-delayed collection delays ADS cleaning to the following day. |
| D-007 | Approved | Collect a designated bin-return location and access instructions, and return cleaned bins there. |
| D-008 | Approved | Create the customer account and portal during signup; after successful Stripe payment, send the customer directly into the portal. |
| D-009 | Approved | Immediately generate a permanent unique referral code. Show its share link and pending, available, and historical rewards in the portal. |
| D-010 | Approved | The customer portal shows the plan, bin count, address, trash day, cleaning day, return instructions, requests, and Stripe billing access. |
| D-011 | Approved | Every signup enters the internal CRM with customer, address, bin count, pickup day, cleaning day, route family, payment status, referral information, and schedule-verification status. |
| D-012 | Approved | Store the official collection-zone registry separately from the customer-confirmed pickup day, compare them, and send mismatches to staff review rather than silently assigning them. |
| D-013 | Approved | Full Flex-style routing, optimized stop ordering, photos, completion texts, gratuities, and municipal automation are later phases; design the database to support them later. |
| D-014 | Approved | Use Stripe test mode until live activation is separately approved. |
| D-015 | Approved | Customers may see only their own portal records, and all administrator-only actions must be protected. |

## Owner decisions required before implementation

| ID | Status | Decision needed |
| --- | --- | --- |
| O-001 | Owner decision required | Define referral reward value, qualification event, pending-to-available timing, redemption rules, expiration/cancellation behavior, and treatment of refunds. |
| O-002 | Owner decision required | Identify the official collection-zone registry source, initial import/maintenance process, and staff schedule-verification workflow. |
| O-003 | Owner decision required | Define route families and the rules used to assign a verified signup to one. |
| O-004 | Owner decision required | Define supported service territory and what happens when an address is outside it. |
| O-005 | Owner decision required | Define handling for pickup schedules outside the approved Monday–Friday mapping, including any Sunday/Monday operational edge cases caused by delays. |
| O-006 | Owner decision required | Define how staff learn of and record holiday delays before municipal automation exists. |
| O-007 | Owner decision required | Define the allowed designated return-location choices and the policy for unsafe, inaccessible, or incomplete access instructions. |
| O-008 | Owner decision required | Define which portal requests customers may submit and the staff workflow/statuses for those requests. |
| O-009 | Owner decision required | Define cancellation, pause, refund, failed-payment, retry, proration, bin-count-change, and same-calendar-date behavior for months lacking the signup day. |
| O-010 | Owner decision required | Approve the authentication, authorization, CRM access roles, and account-recovery behavior before implementation. |
| O-011 | Owner decision required | Approve customer communications and required policy/consent language for signup, billing, referrals, and service access. |

## Change-control rule

New decisions must record an owner-approved outcome here before coding agents implement them. Agents must not overwrite an approved decision with an assumption or a technical preference.
