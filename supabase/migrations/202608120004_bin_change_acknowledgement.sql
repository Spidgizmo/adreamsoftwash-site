-- Allow staff to clear automatic bin-change notices from the CRM without deleting history.
alter table public.customer_bin_change_requests
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid;

create index if not exists customer_bin_change_requests_unacknowledged_idx
  on public.customer_bin_change_requests (requested_at desc)
  where acknowledged_at is null;
