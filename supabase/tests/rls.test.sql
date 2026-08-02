-- Run with: supabase test db. Requires the local seed.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
select ok((select bool_and(relrowsecurity) from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname in ('customers','service_addresses','bins','routes','route_stops','service_visits','visit_photographs','referral_codes','referral_credits')), 'sensitive tables enforce RLS');
select policies_are('public','customers',array['customer_own_read','customer_own_update','staff_manage_customers']);
select policies_are('public','routes',array['route_admin_dispatcher','route_tech_read']);
select policies_are('public','staff_roles',array['admin_staff_roles','staff_role_self_read']);
select policies_are('public','subscriptions',array['subscriptions_admin_manage','subscriptions_owner_read']);
select has_trigger('public','service_visits','enforce_visit_completion','visits enforce documentation');
select col_is_unique('public','referral_codes','code','referral codes are unique');
select col_is_unique('public','service_addresses','normalized_address_hash','duplicate addresses are blocked');
select * from finish();
rollback;
