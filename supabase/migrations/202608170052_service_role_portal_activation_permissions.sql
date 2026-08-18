-- Stripe webhook/customer portal server mutations pass through role-aware guards.
-- Keep those guards in place while allowing the trusted service role to execute
-- the role check and maintain customer contact/marketing preferences.

grant execute on function public.has_role(public.app_role) to service_role;
grant select, insert, update on table public.customer_contact_preferences to service_role;
