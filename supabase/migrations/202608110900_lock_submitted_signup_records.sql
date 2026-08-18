-- A submitted signup is a permanent intake record. Browser drafts may continue to
-- change, but once submitted the row must never be reused for another customer.

create or replace function public.prevent_submitted_signup_mutation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.status = 'submitted_unpaid' then
    raise exception 'Submitted signup records are immutable';
  end if;
  return new;
end
$$;

revoke all on function public.prevent_submitted_signup_mutation()
  from public, anon, authenticated;

drop trigger if exists prevent_submitted_signup_mutation_trigger
  on public.signup_leads;

create trigger prevent_submitted_signup_mutation_trigger
before update on public.signup_leads
for each row execute function public.prevent_submitted_signup_mutation();
