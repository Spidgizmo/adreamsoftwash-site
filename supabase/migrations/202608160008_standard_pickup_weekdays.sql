-- Normal municipal trash/recycling schedules are Monday-Friday. Holiday shift
-- metadata can move an actual collection date separately; customers must never
-- choose Saturday or Sunday as their normal recurring pickup weekday.

alter table public.signup_leads
  drop constraint if exists signup_leads_trash_weekday_check,
  drop constraint if exists signup_leads_recycling_weekday_check;

alter table public.signup_leads
  add constraint signup_leads_trash_weekday_check
    check (trash_weekday is null or trash_weekday between 1 and 5),
  add constraint signup_leads_recycling_weekday_check
    check (recycling_weekday is null or recycling_weekday between 1 and 5);

alter table public.trash_pickup_schedules
  drop constraint if exists trash_pickup_schedules_weekday_check;

alter table public.trash_pickup_schedules
  add constraint trash_pickup_schedules_weekday_check
    check (weekday between 1 and 5);

alter table public.recycling_pickup_schedules
  drop constraint if exists recycling_pickup_schedules_weekday_check;

alter table public.recycling_pickup_schedules
  add constraint recycling_pickup_schedules_weekday_check
    check (weekday between 1 and 5);
