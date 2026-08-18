-- Keep Stripe TEST webhook retries safe and make the deferred address-integrity
-- guard execute with its database-owner privileges. This avoids a service-role
-- permission failure after the activation RPC returns to the deferred trigger.

create or replace function public.require_one_current_address()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  affected_customer uuid;
begin
  affected_customer := case when tg_op='DELETE' then old.customer_id else new.customer_id end;
  if exists(select 1 from public.customers c where c.id=affected_customer)
     and (select count(*) from public.service_addresses a where a.customer_id=affected_customer and a.is_current) <> 1
  then
    raise exception 'Customer must have exactly one current service address';
  end if;
  if tg_op='UPDATE' and old.customer_id is distinct from new.customer_id
     and exists(select 1 from public.customers c where c.id=old.customer_id)
     and (select count(*) from public.service_addresses a where a.customer_id=old.customer_id and a.is_current) <> 1
  then
    raise exception 'Customer must have exactly one current service address';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;

alter function public.require_one_current_address() owner to postgres;
revoke all on function public.require_one_current_address() from public,anon,authenticated,service_role;

create or replace function public.claim_stripe_test_webhook_event(
  p_event_id text,
  p_event_type text,
  p_object_id text,
  p_livemode boolean
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_livemode then raise exception 'Live Stripe events are blocked by the test integration'; end if;

  insert into public.stripe_webhook_events(stripe_event_id,event_type,stripe_object_id,livemode)
  values(p_event_id,p_event_type,p_object_id,false)
  on conflict (stripe_event_id) do update
    set event_type=excluded.event_type,
        stripe_object_id=excluded.stripe_object_id,
        processing_status='received',
        error_message=null,
        received_at=now(),
        processed_at=null
    where public.stripe_webhook_events.processing_status='failed';

  return found;
end
$$;

alter function public.claim_stripe_test_webhook_event(text,text,text,boolean) owner to postgres;
revoke all on function public.claim_stripe_test_webhook_event(text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_stripe_test_webhook_event(text,text,text,boolean) to service_role;
