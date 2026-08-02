# ADS Bin Cleaning Build Roadmap

This roadmap sequences future work only. It does not implement application code, authorize work on `main`, approve a merge or deployment, or approve Stripe live mode. Each phase requires James Gibbs's approval and must preserve the existing American Dream Softwash website and customer flow.

## Phase 0 — Resolve and validate

- Obtain owner decisions listed in [DECISION-LOG.md](./DECISION-LOG.md).
- Inventory existing application boundaries and identify an additive integration plan.
- Define acceptance criteria, privacy/security requirements, and staff responsibilities.
- Confirm the official collection-zone registry source and Stripe test-mode configuration approach without storing secrets in the repository.

**Exit gate:** James Gibbs approves the resolved rules and implementation plan.

## Phase 1 — Data and security foundation

- Design customer, account, address, subscription, bin count, schedule, return instruction, request, referral, reward-ledger, route-family, verification, and service-history data.
- Store registry-derived schedule data separately from customer-confirmed schedule data and preserve comparison/review status.
- Include extensible references for later routing, stop ordering, photos, messages, gratuities, and municipal data.
- Define authorization boundaries for customer-owned records and protected administrator actions.
- Add tests for tenant isolation, administrative authorization, referral-code uniqueness, and schedule mismatch review.

**Exit gate:** Data design and security tests are reviewed and approved; no customer can access another customer's records.

## Phase 2 — Additive signup and Stripe test billing

- Add the dedicated ADS Bin Cleaning page without modifying existing website flows.
- Capture service address, normal pickup day, bin count, designated return location, and access instructions.
- Apply approved monthly pricing and signup-date anniversary billing in Stripe test mode.
- Create the account and portal during signup; generate the permanent unique referral code immediately.
- On successful test payment, send the customer directly to their authenticated portal.
- Handle failures only according to owner-approved rules.

**Exit gate:** End-to-end test-mode signup, pricing, account creation, referral generation, payment, and portal handoff pass approved acceptance tests.

## Phase 3 — Customer portal

- Display plan, bin count, service address, trash day, ADS cleaning day, return instructions, and requests.
- Display the referral code, share link, pending rewards, available rewards, and reward history.
- Provide authorized Stripe billing access.
- Test direct-object-reference and cross-account access attempts to verify strict customer isolation.

**Exit gate:** Portal content and security are approved by James Gibbs.

## Phase 4 — Initial protected CRM and operations

- Send every signup to the internal CRM.
- Display customer, address, bin count, pickup day, cleaning day, route family, payment status, referral information, and schedule-verification status.
- Compare registry and customer-confirmed schedules without combining or overwriting the source values.
- Route every mismatch into a protected staff-review workflow; never silently assign it.
- Support holiday-delay operations according to the owner-approved interim process.

**Exit gate:** Authorized staff validate CRM access, schedule review, route-family handling, and operational readiness.

## Phase 5 — Release readiness

- Run appropriate type, build, automated test, security, accessibility, and end-to-end checks.
- Confirm no secrets, card data, or real customer information exist in the repository or test fixtures.
- Verify existing American Dream Softwash pages and live customer flow remain unchanged.
- Document every changed file, migration/rollback steps, and known limitation.
- Keep Stripe in test mode and do not deploy or merge until James Gibbs separately approves each action.

**Exit gate:** Explicit owner approvals for merge, deployment, and—separately—Stripe live activation.

## Later phases (not MVP)

- Full Flex-style routing application.
- Optimized stop ordering.
- Before/after photos.
- Completion text messages.
- Gratuities.
- Municipal automation.

These capabilities must build on the MVP records rather than require replacement of the core data model.
