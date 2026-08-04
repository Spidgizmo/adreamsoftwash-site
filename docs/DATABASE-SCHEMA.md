# ADS Bin Cleaning database schema — Agent 2 test foundation

Migration `supabase/migrations/202608020001_ads_bin_cleaning_foundation.sql` is the reproducible source for the Supabase PostgreSQL schema. Dashboard-only changes are prohibited. All application tables have RLS enabled and default to no access unless an explicit policy grants it.

## Tables

| Domain | Tables |
|---|---|
| Identity | `user_profiles`, `staff_roles` |
| Customer | `customers`, `service_addresses`, `customer_contact_preferences`, `customer_change_requests`, `bins`, `municipalities` |
| Catalog | `service_plans`, `service_plan_versions`, `subscriptions` |
| Paid service | `paid_service_cycles`, `cleaning_entitlements` |
| Schedule/routing | `trash_pickup_schedules`, `cleaning_day_assignments`, `service_zones`, `routes`, `route_stops` |
| Field work | `service_visits`, `visit_status_history`, `visit_photographs`, `service_exceptions` |
| Referrals | `referral_codes`, `referral_relationships`, `referral_status_history`, `referral_credits` |
| Governance | `customer_notes`, `audit_events` |

The address hash has a non-unique history index; the referral trigger applies duplicate-benefit protection only within the approved 12-month lookback. Pickup source, verification, holiday shift, adjusted pickup, and cleaning date remain separate. A deferred database trigger prevents completion without cleaning, both photo kinds, and bin return or an authorized exception.

## Permanent customer referral codes

Migration `202608030003_customer_referral_code_provisioning.sql` adds trusted, idempotent referral-code provisioning. Each real customer account receives one permanent unique code when the customer row is created. New codes use the readable `ADS-XXXX-XXXX` format with ambiguous characters removed and are still protected by the database unique constraint. The trusted signup service can call `ensure_customer_referral_code(customer_id)` safely more than once and will always receive the same stored code. Anonymous and ordinary authenticated users cannot execute that provisioning function.

Fictional seed customers remain explicit and deterministic. Live signup must create real customer rows with `is_test=false`; the database trigger then provisions the code immediately so the portal and referral link can display it after signup.

## Catalog synchronization

`src/lib/bin-cleaning-catalog.json` is the canonical approved catalog. `src/lib/bin-cleaning-plans.ts` imports that file for typed application pricing, while `scripts/generate-bin-cleaning-catalog.mjs` generates the marked database seed block. `npm test` first runs `catalog:check` and fails if the generated database snapshot diverges. A catalog change requires one owner-approved JSON version followed by `npm run catalog:generate`; the SQL block must not be hand-edited. Historical subscription rows retain the selected immutable version.

## Correction migration

`202608020002_working_crm_corrections.sql` removes permanent address uniqueness, adds non-unique address-history indexing, pending customer change requests, a partial unique active-referral claim index, a 12-month referral-validation trigger with rejection reasons, self-role visibility, assigned-technician customer visibility, dispatcher read-only subscription summaries, and protected mutation audit triggers. Address reuse is legitimate; only referral benefits inside the approved lookback are rejected.
