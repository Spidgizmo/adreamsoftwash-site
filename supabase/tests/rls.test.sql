-- Run with: supabase test db. Requires the local seed.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
select ok((select bool_and(relrowsecurity) from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname in ('customers','service_addresses','bins','routes','route_stops','service_visits','visit_photographs','referral_codes','referral_credits','paid_service_cycles','cleaning_entitlements')), 'sensitive tables enforce RLS');
select policies_are('public','customers',array['customer_assigned_tech_read','customer_own_read','customer_own_update','staff_manage_customers']);
select policies_are('public','routes',array['route_admin_dispatcher','route_tech_read']);
select policies_are('public','staff_roles',array['admin_staff_roles','staff_role_self_read']);
select policies_are('public','subscriptions',array['subscriptions_admin_manage','subscriptions_dispatcher_read','subscriptions_owner_read']);
select has_trigger('public','service_visits','enforce_visit_completion','visits enforce documentation');
select has_index('public','service_addresses','service_addresses_address_history_idx','address history has a non-unique lookup index');
select isnt((select indisunique from pg_index where indexrelid='public.service_addresses_address_history_idx'::regclass),true,'address history index is not unique');
select col_is_unique('public','referral_codes','code','referral codes are unique');
select has_index('public','service_visits','one_completed_visit_per_entitlement','one completion per entitlement is indexed');
select * from finish();
rollback;
