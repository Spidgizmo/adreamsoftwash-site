# Fictional test-data guide

`supabase/seed.sql` is conspicuously labeled fictional and uses `example.test`, reserved-looking `555-010` numbers, impossible ZIP `00000`, and names such as “Avery Sample.” Never substitute real customer information.

Scenarios include all four active plans in the catalog, inactive Every 2 Weeks, one and four bins, staff-verified/customer-confirmed/unverified pickup sources, Friday-to-Saturday and holiday shifts, permanent/valid/pending/qualified referral data, invalid/self/duplicate-address rejection notes, a 12-month credit, weather delay, inaccessible bins, contamination refusal, and a field visit with before/after placeholders and returned bins.

Run `supabase db reset` to recreate the local database, apply migrations, and seed. Test passwords are local fixtures only. Delete/recreate local data rather than copying a production dump.
