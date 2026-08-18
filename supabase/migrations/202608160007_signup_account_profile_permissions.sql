-- The staging signup-account route creates a Supabase Auth user before payment and
-- then creates/updates the matching pending-payment profile through the service-role
-- boundary. Keep browser roles unchanged; only the server service role receives the
-- minimum table privileges needed for that preparation step.

grant select, insert, update on public.user_profiles to service_role;
