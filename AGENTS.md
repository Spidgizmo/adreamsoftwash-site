# ADS Bin Cleaning planning guardrails

These instructions apply to this repository unless a more deeply nested `AGENTS.md` overrides them.

## Ownership and change control

- James Gibbs is the owner and final decision-maker for ADS Bin Cleaning.
- Do not invent business rules, prices, tax conclusions, service areas, or operational policies. Record unresolved matters as owner decisions.
- ADS Bin Cleaning is one connected system inside the existing Next.js application. Its public page, customer portal, CRM, billing, entitlements, and route functions share one backend and customer database.
- Keep ADS Bin Cleaning separate from Lavo. Do not route bin-cleaning customers through Lavo or alter the existing exterior-cleaning Lavo quote flow.

## Delivery constraints

- Build every public, customer, staff, CRM, and field experience to be fully responsive on phones, tablets, laptops, and desktop monitors in portrait and landscape; mobile-first does not mean mobile-only.
- Use a central, versioned service-plan catalog. Never duplicate pricing or eligibility rules in the website, portal, CRM, billing, tax, entitlement, or routing layers.
- Use the authoritative launch configuration for promotions and operational rules. Never duplicate ONE45, NEW25, referral, payment-grace, cleaning-day, or bin-return rules across surfaces.
- When a historical planning record conflicts with the current authoritative launch configuration, the latest owner-approved configuration version controls; preserve the older text only as clearly superseded history.
- Launch plans are Monthly, Quarterly, Twice a Year, and One-Time Cleaning. Every 2 Weeks is future/inactive; Every 4 Weeks, Every 8 Weeks, and Bi-monthly are not launch offerings.
- Use Stripe test mode until James Gibbs approves live activation. Never commit secrets or store raw payment-card data.
- Keep login, signup, payment, subscription, service, entitlement, and route statuses separate.
- Preserve audit histories for pricing, plans, tax calculations, payments, promotions, referrals, status transitions, staff actions, and scheduling decisions.
- Do not activate live signup until accounts, the portal, Stripe test billing, and the minimum CRM connection operate together.

## Planning sources

- Authoritative launch rules: `docs/ADS-BIN-CLEANING-LAUNCH-CONFIG.md`
- Permanent numbered launch checklist: `docs/ADS-BIN-CLEANING-LAUNCH-CHECKLIST.md`
- Product requirements: `docs/ADS-BIN-CLEANING-MVP.md`
- Approved and unresolved decisions: `docs/DECISION-LOG.md`
- Connected technical design: `docs/ARCHITECTURE-PROPOSAL.md`
- Approved delivery sequence: `docs/BUILD-ROADMAP.md`

When requirements change, update all affected planning documents together and run consistency checks before implementation.
