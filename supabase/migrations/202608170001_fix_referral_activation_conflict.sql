do $$
declare
  v_oid oid;
  v_def text;
  v_old text := 'on conflict (referred_customer_id) do nothing;';
  v_new text := 'on conflict (referred_customer_id) where (status <> all (array[''rejected''::public.referral_status,''reversed''::public.referral_status])) do nothing;';
begin
  select p.oid into v_oid
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='activate_stripe_test_payment'
  limit 1;

  if v_oid is null then
    raise exception 'activate_stripe_test_payment not found';
  end if;

  select pg_get_functiondef(v_oid) into v_def;
  if position(v_old in v_def)=0 then
    raise exception 'expected referral conflict clause not found';
  end if;

  execute replace(v_def,v_old,v_new);
end $$;
