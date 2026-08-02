# ADS Bin Cleaning security and role permissions

## Boundary

Supabase Auth supplies identities; PostgreSQL RLS is the enforcement boundary. UI visibility is not authorization. All records are fictional and test-only. Service-role credentials are server-only and are never exposed to a browser.

| Role | Permissions |
|---|---|
| Customer | Read their profile, customer, address, bins, schedules, visits/photos, subscription summaries, and referral ledger only. Update their own profile/contact preferences and allowed bin fields; route-affecting updates go to staff review. |
| Administrator | Manage customer, address, catalog, subscription, routes, visits, referrals/credits, exceptions, municipalities/zones, notes, and staff role grants. Read audit records. |
| Dispatcher | Manage customers, addresses, pickup/cleaning assignments, routes/stops, visits, preparation data, and exceptions. Cannot manage roles, catalog/pricing, subscriptions/financial credits, or protected settings. |
| Field technician | Read assigned routes/stops, their necessary customer/address/bin/safety data, and assigned visits only. Update assigned visit state, add assigned-visit photos and exceptions. Cannot list unrelated routes/customers or see financial/payment-card data. |

## Policy inventory

Policies cover: own-profile read/update; administrator-only roles; own or admin/dispatcher customer access; address/bin isolation with assigned-technician exception; own contact preferences; authenticated catalog reads and administrator-only catalog writes; customer/admin subscription summaries; assigned visit access; assigned photo upload; private referral/credit reads and admin management; staff-only notes; admin audit reads and staff audit inserts; dispatcher/admin route operations; assigned-tech route/stop reads; owner/staff pickup, cleaning, visit-history, photo, and exception access; authenticated municipality reads; admin zones/municipalities; and private referral status history.

No policy exposes another customer to a customer, an unrelated route to a technician, payment-card data (none is stored), staff roles to non-admin staff, or catalog/financial mutations to dispatchers.

## Runtime route enforcement

Middleware validates each private request through Supabase Auth before rendering. Customers are restricted to `/bin-cleaning/portal`; administrators and dispatchers to CRM (administrators may also inspect field work); field technicians to assigned field routes. Missing/expired sessions redirect to login and clear cookies. Login stores tokens only in HTTP-only, SameSite cookies, and logout clears them. RLS remains authoritative for every database request.
