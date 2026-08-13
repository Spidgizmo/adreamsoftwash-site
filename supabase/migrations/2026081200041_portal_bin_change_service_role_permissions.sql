-- Complete server-only permissions required by the customer bin-change reconciliation flow.
-- Stripe remains disabled; this migration changes no payment behavior.

grant select, insert, update on public.bins to service_role;
grant select, insert, update on public.recycling_pickup_schedules to service_role;
grant select, update on public.subscriptions to service_role;
