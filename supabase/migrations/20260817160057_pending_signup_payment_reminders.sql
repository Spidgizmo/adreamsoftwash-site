create table if not exists public.signup_payment_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  signup_lead_id uuid not null references public.signup_leads(id) on delete cascade,
  kind text not null check (kind in ('payment_reminder_1h', 'payment_reminder_24h')),
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'scheduled' check (status in ('scheduled', 'queued', 'sent', 'canceled', 'failed')),
  send_after timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists signup_payment_notification_outbox_due_idx
  on public.signup_payment_notification_outbox (status, send_after)
  where status in ('scheduled', 'queued');
create index if not exists signup_payment_notification_outbox_lead_idx
  on public.signup_payment_notification_outbox (signup_lead_id, created_at desc);

alter table public.signup_payment_notification_outbox enable row level security;
revoke all on public.signup_payment_notification_outbox from anon, authenticated;
grant select, insert, update, delete on public.signup_payment_notification_outbox to service_role;

create or replace function public.cancel_signup_payment_reminders_after_conversion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'converted' and old.status is distinct from new.status then
    update public.signup_payment_notification_outbox
       set status = 'canceled',
           processed_at = coalesce(processed_at, now())
     where signup_lead_id = new.id
       and status in ('scheduled', 'queued');
  end if;
  return new;
end;
$$;

revoke all on function public.cancel_signup_payment_reminders_after_conversion() from public, anon, authenticated;
grant execute on function public.cancel_signup_payment_reminders_after_conversion() to service_role;

drop trigger if exists trg_cancel_signup_payment_reminders_after_conversion on public.signup_leads;
create trigger trg_cancel_signup_payment_reminders_after_conversion
after update of status on public.signup_leads
for each row
execute function public.cancel_signup_payment_reminders_after_conversion();
