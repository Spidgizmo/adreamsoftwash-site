import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/202608120002_bin_change_history_and_visit_snapshots.sql",
  import.meta.url,
);
const portalRoutePath = new URL(
  "../src/app/api/bin-cleaning/portal/route.ts",
  import.meta.url,
);
const manageBinsPath = new URL(
  "../src/components/bin-cleaning/ManageBinsForm.tsx",
  import.meta.url,
);
const portalPagePath = new URL(
  "../src/app/bin-cleaning/portal/page.tsx",
  import.meta.url,
);

test("bin changes preserve old/new counts, prices, actor, and effective policy", async () => {
  const migration = await readFile(migrationPath, "utf8");
  for (const field of [
    "old_trash_bin_count",
    "old_recycling_bin_count",
    "new_trash_bin_count",
    "new_recycling_bin_count",
    "old_recurring_price_cents",
    "new_recurring_price_cents",
    "requested_by",
    "requested_at",
    "service_effective_at",
    "billing_effective_policy",
    "locked_visit_id",
  ]) {
    assert.match(migration, new RegExp(field));
  }
  assert.match(migration, /billing_effective_policy = 'next_renewal'/);
});

test("assigned visits receive immutable service configuration snapshots", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /service_visit_configuration_snapshots/);
  assert.match(migration, /new\.status not in \('assigned','en_route','arrived'/);
  assert.match(migration, /Locked service visit configuration snapshots are immutable/);
  assert.match(migration, /before update or delete on public\.service_visit_configuration_snapshots/);
  assert.match(migration, /preferred_return_location/);
  assert.match(migration, /recycling_anchor_collection_date/);
});

test("portal bin management shows the next-renewal price before confirmation", async () => {
  const [form, page] = await Promise.all([
    readFile(manageBinsPath, "utf8"),
    readFile(portalPagePath, "utf8"),
  ]);
  assert.match(form, /Current recurring estimate/);
  assert.match(form, /New recurring estimate/);
  assert.match(form, /next billing renewal/);
  assert.match(form, /already locked for routing/);
  assert.match(page, /Bin change history/);
  assert.match(page, /locked visit keeps its own immutable bin snapshot/);
});

test("adding recycling requires schedule data and updates future alignment", async () => {
  const route = await readFile(portalRoutePath, "utf8");
  assert.match(route, /bin_recycling_weekday/);
  assert.match(route, /bin_recycling_frequency_weeks/);
  assert.match(route, /bin_recycling_anchor/);
  assert.match(route, /customer_confirmed/);
  assert.match(route, /service_alignment: "recycling_collection"/);
  assert.match(route, /service_alignment: "trash_collection"/);
});

test("portal changes are recorded before the active bin rows are reconciled", async () => {
  const route = await readFile(portalRoutePath, "utf8");
  const audit = route.indexOf("customer_bin_change_requests");
  const reconcile = route.indexOf("const reconcileBins = async");
  assert.ok(audit >= 0, "change request insert should exist");
  assert.ok(reconcile > audit, "evidence must be stored before current bin rows change");
});
