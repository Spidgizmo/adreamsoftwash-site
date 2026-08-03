-- Give API roles table privileges while RLS remains the row-level authority.
-- Anonymous access is limited to the one table used by the explicit no-row isolation test.
grant usage on schema public to anon, authenticated;
grant select on public.customers to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
