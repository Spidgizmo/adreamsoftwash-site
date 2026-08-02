# ADS Bin Cleaning database schema — Agent 2 test foundation

Migration `supabase/migrations/202608020001_ads_bin_cleaning_foundation.sql` is the reproducible source for the Supabase PostgreSQL schema. Dashboard-only changes are prohibited. All application tables have RLS enabled and default to no access unless an explicit policy grants it.

## Tables

| Domain | Tables |
|---|---|
| Identity | `user_profiles`, `staff_roles` |
| Customer | `customers`, `service_addresses`, `customer_contact_preferences`, `bins`, `municipalities` |
| Catalog | `service_plans`, `service_plan_versions`, `subscriptions` |
| Schedule/routing | `trash_pickup_schedules`, `cleaning_day_assignments`, `service_zones`, `routes`, `route_stops` |
| Field work | `service_visits`, `visit_status_history`, `visit_photographs`, `service_exceptions` |
| Referrals | `referral_codes`, `referral_relationships`, `referral_status_history`, `referral_credits` |
| Governance | `customer_notes`, `audit_events` |

The address hash has a uniqueness constraint for duplicate-household defense. Pickup source, verification, holiday shift, adjusted pickup, and cleaning date remain separate. A deferred database trigger prevents completion without cleaning, both photo kinds, and bin return or an authorized exception.

## Catalog synchronization

`src/lib/bin-cleaning-plans.ts` remains the reviewed, typed catalog consumed by application pricing. The database version rows are a generated synchronization snapshot labeled with the identical `2026-08-02-approved-pricing` version; they must not be hand-edited. A catalog change requires one owner-approved version, updates to the typed catalog and migration snapshot in the same commit, and pricing/consistency tests. Historical subscription rows retain the selected immutable version.
