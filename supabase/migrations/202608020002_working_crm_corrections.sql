-- Agent 2 correction: address history, change requests, referral lookback, and mutation auditing.
alter table public.service_addresses drop constraint if exists service_addresses_normalized_address_hash_key;
alter table public.referral_relationships drop constraint if exists referral_relationships_referred_customer_id_key;
alter table public.referral_relationships drop constraint if exists referral_relationships_check;
create index service_addresses_address_history_idx on public.service_addresses(normalized_address_hash,created_at);
create unique index referral_one_active_claim_per_customer on public.referral_relationships(referred_customer_id) where status not in ('rejected','reversed');
create table public.customer_change_requests(id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),service_address_id uuid references public.service_addresses(id),request_type text not null check(request_type in ('return_location','access_instructions','gate_information','animal_warning','bin_count')),requested_value jsonb not null,status text not null default 'pending_staff_review',requested_by uuid not null references public.user_profiles(id),reviewed_by uuid references public.user_profiles(id),reviewed_at timestamptz,rejection_reason text,created_at timestamptz not null default now());
alter table public.customer_change_requests enable row level security;
create policy change_request_owner on public.customer_change_requests for select using(public.owns_customer(customer_id));
create policy change_request_owner_insert on public.customer_change_requests for insert with check(public.owns_customer(customer_id) and requested_by=auth.uid() and status='pending_staff_review');
create policy change_request_staff on public.customer_change_requests for all using(public.has_role('administrator') or public.has_role('dispatcher')) with check(public.has_role('administrator') or public.has_role('dispatcher'));

create or replace function public.validate_referral_claim() returns trigger language plpgsql security definer set search_path=public as $$ declare ref_address text; begin
 if new.referrer_customer_id=new.referred_customer_id then new.status='rejected';new.rejection_reason='self_referral';return new;end if;
 select normalized_address_hash into ref_address from service_addresses where customer_id=new.referred_customer_id order by created_at desc limit 1;
 if exists(select 1 from referral_relationships r where r.referred_customer_id=new.referred_customer_id and r.status not in ('rejected','reversed')) then new.status='rejected';new.rejection_reason='duplicate_active_claim';return new;end if;
 if exists(select 1 from referral_relationships r where r.referred_address_hash=ref_address and r.created_at>now()-interval '12 months' and r.status not in ('rejected','reversed')) then new.status='rejected';new.rejection_reason='address_lookback';return new;end if;
 new.referred_address_hash=ref_address;return new;end $$;
create trigger validate_referral_before_insert before insert on public.referral_relationships for each row execute function public.validate_referral_claim();

create or replace function public.audit_protected_mutation() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into audit_events(actor_id,action,entity_table,entity_id,before_data,after_data) values(auth.uid(),tg_op,tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'user_id',to_jsonb(old)->>'user_id')::uuid,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);return coalesce(new,old);end $$;
do $$ declare t text;begin foreach t in array array['staff_roles','customers','service_addresses','service_plans','service_plan_versions','subscriptions','routes','route_stops','service_visits','service_exceptions','referral_relationships','referral_credits','customer_change_requests'] loop execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_protected_mutation()',t,t);end loop;end $$;
create policy subscriptions_dispatcher_read on public.subscriptions for select using(public.has_role('dispatcher'));
create policy staff_role_self_read on public.staff_roles for select using(user_id=auth.uid());
create policy customer_assigned_tech_read on public.customers for select using(exists(select 1 from public.service_visits v where v.customer_id=customers.id and v.assigned_technician_id=auth.uid()));
