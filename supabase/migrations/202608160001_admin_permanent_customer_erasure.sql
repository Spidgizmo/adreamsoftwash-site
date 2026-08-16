-- Administrator-only permanent erasure for CRM housekeeping.
-- These functions intentionally remove application/auth records rather than merely
-- deactivating them. They are callable only through the server-side service-role
-- boundary, and they independently verify that the requesting actor is an active
-- administrator.

create or replace function public.admin_hard_delete_signup_lead(
  p_signup_lead_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user_id uuid;
  v_attempt_ids uuid[] := '{}'::uuid[];
  v_deleted_auth boolean := false;
begin
  if not exists (
    select 1 from public.staff_roles
    where user_id = p_actor_id
      and role = 'administrator'::public.app_role
      and revoked_at is null
  ) then
    raise exception 'Administrator authorization is required';
  end if;

  select auth_user_id into v_auth_user_id
  from public.signup_leads
  where id = p_signup_lead_id
  for update;

  if not found then
    raise exception 'Signup lead was not found';
  end if;

  -- A signup that has already produced a customer must be erased from the
  -- customer record so the customer/service/billing graph is removed together.
  if exists (
    select 1
    from public.customers c
    where (v_auth_user_id is not null and c.user_id = v_auth_user_id)
       or exists (
         select 1
         from public.stripe_checkout_attempts a
         where a.signup_lead_id = p_signup_lead_id
           and a.stripe_customer_id is not null
           and a.stripe_customer_id = c.stripe_customer_id
       )
  ) then
    raise exception 'This signup is already linked to a customer; erase it from the customer record instead';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
    into v_attempt_ids
  from public.stripe_checkout_attempts
  where signup_lead_id = p_signup_lead_id;

  delete from public.stripe_webhook_events e
  where e.stripe_object_id in (
    select x.object_id
    from (
      select stripe_checkout_session_id as object_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
      union all select stripe_customer_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
      union all select stripe_subscription_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
      union all select stripe_invoice_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
      union all select stripe_payment_intent_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
    ) x
    where x.object_id is not null
  );

  delete from public.promotion_redemptions
  where signup_lead_id = p_signup_lead_id
     or stripe_checkout_attempt_id = any(v_attempt_ids);

  delete from public.stripe_checkout_attempts where id = any(v_attempt_ids);
  delete from public.signup_lead_status_history where signup_lead_id = p_signup_lead_id;
  delete from public.signup_leads where id = p_signup_lead_id;

  delete from public.audit_events
  where entity_id = p_signup_lead_id
     or coalesce(before_data::text, '') like '%' || p_signup_lead_id::text || '%'
     or coalesce(after_data::text, '') like '%' || p_signup_lead_id::text || '%';

  if v_auth_user_id is not null
     and v_auth_user_id <> p_actor_id
     and not exists (select 1 from public.staff_roles where user_id = v_auth_user_id and revoked_at is null)
     and not exists (select 1 from public.customers where user_id = v_auth_user_id)
     and not exists (select 1 from public.signup_leads where auth_user_id = v_auth_user_id)
  then
    delete from public.audit_events where actor_id = v_auth_user_id;
    delete from auth.users where id = v_auth_user_id;
    v_deleted_auth := found;
  end if;

  insert into public.audit_events(actor_id, action, entity_table, entity_id, before_data, after_data, reason, entity_key)
  values(p_actor_id, 'signup.permanent_erasure', 'signup_leads', null, null, null, 'Administrator permanently erased a signup record', 'erased_signup');

  return jsonb_build_object(
    'ok', true,
    'kind', 'signup',
    'authUserDeleted', v_deleted_auth
  );
end
$$;

revoke all on function public.admin_hard_delete_signup_lead(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_hard_delete_signup_lead(uuid, uuid) to service_role;

create or replace function public.admin_hard_delete_customer(
  p_customer_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_stripe_customer_id text;
  v_address_ids uuid[] := '{}'::uuid[];
  v_subscription_ids uuid[] := '{}'::uuid[];
  v_cycle_ids uuid[] := '{}'::uuid[];
  v_entitlement_ids uuid[] := '{}'::uuid[];
  v_visit_ids uuid[] := '{}'::uuid[];
  v_route_stop_ids uuid[] := '{}'::uuid[];
  v_trash_schedule_ids uuid[] := '{}'::uuid[];
  v_relationship_ids uuid[] := '{}'::uuid[];
  v_signup_lead_ids uuid[] := '{}'::uuid[];
  v_attempt_ids uuid[] := '{}'::uuid[];
  v_deleted_auth boolean := false;
begin
  if not exists (
    select 1 from public.staff_roles
    where user_id = p_actor_id
      and role = 'administrator'::public.app_role
      and revoked_at is null
  ) then
    raise exception 'Administrator authorization is required';
  end if;

  select user_id, stripe_customer_id
    into v_user_id, v_stripe_customer_id
  from public.customers
  where id = p_customer_id
  for update;

  if not found then
    raise exception 'Customer was not found';
  end if;

  if v_user_id = p_actor_id then
    raise exception 'An administrator cannot erase their own identity through a customer record';
  end if;

  if v_user_id is not null and exists (
    select 1 from public.staff_roles
    where user_id = v_user_id and revoked_at is null
  ) then
    raise exception 'A customer linked to a staff identity cannot be permanently erased here';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_address_ids
  from public.service_addresses where customer_id = p_customer_id;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_subscription_ids
  from public.subscriptions where customer_id = p_customer_id;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_cycle_ids
  from public.paid_service_cycles where customer_id = p_customer_id;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_entitlement_ids
  from public.cleaning_entitlements where customer_id = p_customer_id;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_visit_ids
  from public.service_visits where customer_id = p_customer_id;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_route_stop_ids
  from public.route_stops where service_address_id = any(v_address_ids);

  select coalesce(array_agg(id), '{}'::uuid[]) into v_trash_schedule_ids
  from public.trash_pickup_schedules where service_address_id = any(v_address_ids);

  select coalesce(array_agg(id), '{}'::uuid[]) into v_relationship_ids
  from public.referral_relationships
  where referrer_customer_id = p_customer_id or referred_customer_id = p_customer_id;

  select coalesce(array_agg(distinct l.id), '{}'::uuid[])
    into v_signup_lead_ids
  from public.signup_leads l
  where (v_user_id is not null and l.auth_user_id = v_user_id)
     or exists (
       select 1 from public.stripe_checkout_attempts a
       where a.signup_lead_id = l.id
         and v_stripe_customer_id is not null
         and a.stripe_customer_id = v_stripe_customer_id
     );

  select coalesce(array_agg(id), '{}'::uuid[])
    into v_attempt_ids
  from public.stripe_checkout_attempts
  where signup_lead_id = any(v_signup_lead_ids)
     or (v_stripe_customer_id is not null and stripe_customer_id = v_stripe_customer_id);

  -- Remove webhook bookkeeping associated with this customer's Stripe object IDs.
  delete from public.stripe_webhook_events e
  where e.stripe_object_id = v_stripe_customer_id
     or e.stripe_object_id in (
       select x.object_id
       from (
         select stripe_checkout_session_id as object_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
         union all select stripe_subscription_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
         union all select stripe_invoice_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
         union all select stripe_payment_intent_id from public.stripe_checkout_attempts where id = any(v_attempt_ids)
         union all select stripe_subscription_id from public.subscriptions where id = any(v_subscription_ids)
         union all select stripe_latest_invoice_id from public.subscriptions where id = any(v_subscription_ids)
         union all select stripe_invoice_id from public.paid_service_cycles where id = any(v_cycle_ids)
         union all select stripe_payment_intent_id from public.paid_service_cycles where id = any(v_cycle_ids)
       ) x
       where x.object_id is not null
     );

  -- Referral graph. Relationships can point both to and from the customer.
  delete from public.referral_notification_outbox
  where recipient_customer_id = p_customer_id
     or referral_relationship_id = any(v_relationship_ids);
  delete from public.referral_credits
  where customer_id = p_customer_id
     or referral_relationship_id = any(v_relationship_ids);
  delete from public.referral_status_history
  where referral_relationship_id = any(v_relationship_ids);
  delete from public.referral_relationships where id = any(v_relationship_ids);
  delete from public.referral_codes where customer_id = p_customer_id;

  -- Customer notes/change history and visit-linked records.
  delete from public.customer_notes where customer_id = p_customer_id;
  delete from public.customer_change_requests where customer_id = p_customer_id;
  delete from public.service_visit_configuration_snapshots where customer_id = p_customer_id;
  delete from public.customer_bin_configurations where customer_id = p_customer_id;
  delete from public.customer_bin_change_requests where customer_id = p_customer_id;

  delete from public.service_exceptions where service_visit_id = any(v_visit_ids);
  delete from public.visit_photographs where service_visit_id = any(v_visit_ids);
  delete from public.visit_status_history where service_visit_id = any(v_visit_ids);
  delete from public.service_visits where id = any(v_visit_ids);
  delete from public.route_stops where id = any(v_route_stop_ids);

  -- Pickup/cleaning schedule graph.
  delete from public.cleaning_day_assignments where pickup_schedule_id = any(v_trash_schedule_ids);
  delete from public.trash_pickup_schedules where id = any(v_trash_schedule_ids);
  delete from public.recycling_pickup_schedules where service_address_id = any(v_address_ids);

  -- Billing/entitlement graph.
  delete from public.cleaning_entitlements where id = any(v_entitlement_ids);
  delete from public.paid_service_cycles where id = any(v_cycle_ids);
  delete from public.subscriptions where id = any(v_subscription_ids);

  -- Promotion/signup/checkout graph tied to this customer identity.
  delete from public.promotion_redemptions
  where customer_id = p_customer_id
     or signup_lead_id = any(v_signup_lead_ids)
     or stripe_checkout_attempt_id = any(v_attempt_ids);
  delete from public.stripe_checkout_attempts where id = any(v_attempt_ids);
  delete from public.signup_lead_status_history where signup_lead_id = any(v_signup_lead_ids);
  delete from public.signup_leads where id = any(v_signup_lead_ids);

  -- Address descendants with CASCADE constraints are intentionally removed here
  -- after non-cascading route/change/schedule references have been cleared.
  delete from public.service_address_occupancy_history where customer_id = p_customer_id;
  delete from public.customer_contact_preferences where customer_id = p_customer_id;
  delete from public.service_addresses where id = any(v_address_ids);

  -- Remove audit material that can still identify the erased customer. A generic,
  -- non-identifying erasure event is written after cleanup for admin accountability.
  delete from public.audit_events
  where entity_id = p_customer_id
     or (v_user_id is not null and actor_id = v_user_id)
     or coalesce(before_data::text, '') like '%' || p_customer_id::text || '%'
     or coalesce(after_data::text, '') like '%' || p_customer_id::text || '%';

  delete from public.customers where id = p_customer_id;

  if v_user_id is not null
     and not exists (select 1 from public.customers where user_id = v_user_id)
     and not exists (select 1 from public.signup_leads where auth_user_id = v_user_id)
     and not exists (select 1 from public.staff_roles where user_id = v_user_id and revoked_at is null)
  then
    delete from auth.users where id = v_user_id;
    v_deleted_auth := found;
  end if;

  insert into public.audit_events(actor_id, action, entity_table, entity_id, before_data, after_data, reason, entity_key)
  values(p_actor_id, 'customer.permanent_erasure', 'customers', null, null, null, 'Administrator permanently erased a customer and related application data', 'erased_customer');

  return jsonb_build_object(
    'ok', true,
    'kind', 'customer',
    'authUserDeleted', v_deleted_auth,
    'stripeCustomerId', v_stripe_customer_id
  );
end
$$;

revoke all on function public.admin_hard_delete_customer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_hard_delete_customer(uuid, uuid) to service_role;
