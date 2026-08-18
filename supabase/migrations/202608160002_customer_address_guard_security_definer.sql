-- The customer-level "exactly one current address" constraint trigger is deferred.
-- When Stripe activation is called through PostgREST as service_role, the deferred
-- trigger fires after the SECURITY DEFINER activation function returns. Execute
-- this integrity check with its database-owner privileges so it can read the
-- protected service_addresses table without granting broad table access.

alter function public.require_customer_current_address() security definer;
alter function public.require_customer_current_address() owner to postgres;
