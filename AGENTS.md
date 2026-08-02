# Repository Instructions

These instructions apply to the entire repository and to every future coding agent.

## Authority and approvals

- James Gibbs is the owner and final decision-maker.
- Never work directly on `main`; use an approved feature branch.
- Never deploy or merge without James Gibbs's approval.
- Do not invent business rules.
- Do not replace or reinterpret approved pricing, billing, scheduling, referral, or route rules. If a needed rule is missing or ambiguous, document it and request an owner decision before implementation.

## Preserve the current business

- Preserve the existing American Dream Softwash website, including its pages, components, styling, navigation, deployment settings, and live customer flow, unless James Gibbs separately approves a specific change.
- Keep ADS Bin Cleaning work isolated and additive.

## Security and privacy

- Never store API keys, passwords, card data, or real customer information in the repository.
- Use Stripe test mode until live activation is separately approved by James Gibbs.
- Enforce tenant isolation: every customer must be able to see only their own portal records.
- Protect every administrator-only action with authentication and authorization.

## Verification and reporting

- Run appropriate type, build, and test checks before reporting completion.
- Clearly report every file changed.
