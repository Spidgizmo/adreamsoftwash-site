-- Track fictional customer portal usage for CRM visibility.
alter table public.customers
  add column if not exists last_portal_activity_at timestamptz,
  add column if not exists last_portal_login_at timestamptz;

create or replace function public.record_my_portal_activity(p_kind text default 'view')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_customer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_kind not in ('login','view') then
    raise exception 'Unsupported portal activity kind';
  end if;

  update public.customers
     set last_portal_activity_at = now(),
         last_portal_login_at = case when p_kind = 'login' then now() else last_portal_login_at end
   where user_id = auth.uid()
     and is_test = true
  returning id into target_customer_id;

  if target_customer_id is null then
    raise exception 'No customer is linked to this identity';
  end if;

  insert into public.audit_events(actor_id, action, entity_table, entity_id, reason)
  values (
    auth.uid(),
    case when p_kind='login' then 'PORTAL_LOGIN' else 'PORTAL_VIEW' end,
    'customers',
    target_customer_id,
    'Fictional staging portal activity'
  );
end;
$$;

revoke all on function public.record_my_portal_activity(text) from public;
grant execute on function public.record_my_portal_activity(text) to authenticated;
