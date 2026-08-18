-- Referral rewards are discrete lifetime rewards, not a stackable cash balance.
-- First qualified lifetime referral = 50% of one eligible Monthly base cleaning.
-- Every later qualified referral = 25% of one eligible Monthly base cleaning.
-- Billing consumes at most one queued reward per eligible invoice, oldest first.

alter table public.referral_credits
  add column if not exists referral_sequence integer,
  add column if not exists reward_percent smallint;

with ranked as (
  select
    id,
    row_number() over (
      partition by customer_id
      order by earned_at asc, id asc
    )::integer as referral_sequence
  from public.referral_credits
)
update public.referral_credits credit
set
  referral_sequence = ranked.referral_sequence,
  reward_percent = case when ranked.referral_sequence = 1 then 50 else 25 end
from ranked
where ranked.id = credit.id
  and (credit.referral_sequence is null or credit.reward_percent is null);

alter table public.referral_credits
  alter column referral_sequence set not null,
  alter column reward_percent set not null;

alter table public.referral_credits
  add constraint referral_credits_sequence_positive
    check (referral_sequence > 0),
  add constraint referral_credits_reward_percent_valid
    check (reward_percent in (25, 50));

create unique index if not exists referral_credits_customer_sequence_key
  on public.referral_credits(customer_id, referral_sequence);

create or replace function public.enforce_referral_reward_queue()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  expected_sequence integer;
  expected_percent smallint;
begin
  if tg_op = 'UPDATE' then
    if new.customer_id <> old.customer_id
       or new.referral_sequence <> old.referral_sequence
       or new.reward_percent <> old.reward_percent then
      raise exception 'Referral reward owner, sequence, and percentage are immutable';
    end if;
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.customer_id::text, 0));

  select coalesce(max(credit.referral_sequence), 0) + 1
  into expected_sequence
  from public.referral_credits credit
  where credit.customer_id = new.customer_id;

  expected_percent := case when expected_sequence = 1 then 50 else 25 end;

  if new.referral_sequence is null then
    new.referral_sequence := expected_sequence;
  elsif new.referral_sequence <> expected_sequence then
    raise exception 'Referral rewards must be queued in lifetime order';
  end if;

  if new.reward_percent is null then
    new.reward_percent := expected_percent;
  elsif new.reward_percent <> expected_percent then
    raise exception 'First lifetime referral reward is 50 percent; later rewards are 25 percent';
  end if;

  return new;
end
$$;

drop trigger if exists enforce_referral_reward_queue on public.referral_credits;
create trigger enforce_referral_reward_queue
before insert or update of customer_id, referral_sequence, reward_percent
on public.referral_credits
for each row execute function public.enforce_referral_reward_queue();

create or replace function public.next_referral_reward(target_customer uuid)
returns table(
  id uuid,
  referral_sequence integer,
  reward_percent smallint,
  earned_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select
    credit.id,
    credit.referral_sequence,
    credit.reward_percent,
    credit.earned_at,
    credit.expires_at
  from public.referral_credits credit
  where credit.customer_id = target_customer
    and credit.status = 'issued'
    and credit.expires_at > now()
  order by credit.referral_sequence asc, credit.earned_at asc, credit.id asc
  limit 1
$$;

revoke all on function public.next_referral_reward(uuid) from public;
grant execute on function public.next_referral_reward(uuid) to authenticated;
