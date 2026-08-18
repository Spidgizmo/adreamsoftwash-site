-- Keep fictional signup persistence behind the application server.
-- The browser must never call this SECURITY DEFINER function directly.

revoke execute on function public.save_fictional_signup_lead(jsonb,uuid,text,text)
  from anon, authenticated;

grant execute on function public.save_fictional_signup_lead(jsonb,uuid,text,text)
  to service_role;

create index if not exists signup_lead_status_history_lead_idx
  on public.signup_lead_status_history(signup_lead_id);

create index if not exists signup_leads_plan_id_idx
  on public.signup_leads(plan_id);
