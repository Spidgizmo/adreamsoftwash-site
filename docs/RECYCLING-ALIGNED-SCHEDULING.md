# ADS Bin Cleaning recycling-aligned scheduling

**Owner decision:** James Gibbs  
**Effective:** 2026-08-05  
**Applies to:** signup, portal, CRM, scheduling, routing, holiday shifts, and acceptance tests

## Customer-facing rule

When a customer includes a recycling cart in service, ADS does not schedule that cleaning after an ordinary trash-only collection week. The service waits for the next verified recycling collection so the trash and recycling carts are expected to be empty and available together.

ADS still cleans on the next calendar day after collection. “Recycling-aligned” means the qualifying collection week is a recycling week; it does not mean ADS cleans before the municipality empties the carts.

Example:

- Customer signs up Friday.
- Trash collection is Tuesday.
- The upcoming Tuesday is a trash-only week.
- Recycling is collected the following Tuesday.
- The first eligible ADS cleaning is Wednesday after that recycling collection, not Wednesday after the earlier trash-only collection.

## Required signup information

Signup must collect:

1. Which enrolled cart is trash, recycling, or other.
2. Trash pickup weekday.
3. Recycling pickup weekday.
4. Recycling frequency, including weekly or every other week.
5. The date of the next scheduled recycling pickup, or another verified actual recycling collection date.

The date is required because “every other Tuesday” cannot be calculated from Tuesday alone. The date anchors which alternating week is the recycling week.

## Automatic scheduling

- Trash-only enrollment: use the next eligible trash collection, then clean the next calendar day.
- Enrollment containing a recycling cart: use the next verified recycling collection, then clean the next calendar day.
- Each later paid service entitlement containing recycling follows the next eligible recycling collection after that entitlement becomes schedulable.
- A one-visit bin checkbox does not change the subscription's collection alignment.
- Holiday collection shifts move the ADS cleaning date to the next calendar day after the adjusted qualifying collection.

## Staff review

Automatic assignment stops and creates staff review when:

- recycling weekday/frequency/reference date is missing or inconsistent;
- the reference date does not fall on the selected recycling weekday;
- trash and recycling are collected on different weekdays;
- official and customer-reported schedules disagree;
- holiday information is unresolved.

Staff must resolve the schedule before the customer silently enters a route.

## Stored data

- `bins.collection_stream`: `trash`, `recycling`, or `other`.
- `subscriptions.service_alignment`: `trash_collection`, `recycling_collection`, or `staff_review_required`.
- `recycling_pickup_schedules`: weekday, frequency in weeks, anchor collection date, source, verification status, effective dates, holiday shift, and current/history state.
- Portal recycling corrections are stored as staff-reviewed `customer_change_requests`; customers do not directly rewrite protected route data.
