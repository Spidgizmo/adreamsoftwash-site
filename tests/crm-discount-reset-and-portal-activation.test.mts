import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const crmPath = new URL("../src/app/bin-cleaning/crm/page.tsx", import.meta.url);
const resetPath = new URL("../src/app/api/bin-cleaning/auth/reset-password/route.ts", import.meta.url);
const migrationPath = new URL("../supabase/migrations/202608170052_service_role_portal_activation_permissions.sql", import.meta.url);

test("CRM shows signup discount and first charge instead of hiding them behind regular price", async () => {
  const source = await readFile(crmPath, "utf8");
  assert.match(source, /Signup discount/);
  assert.match(source, /First charge/);
  assert.match(source, /estimated_discount_cents/);
  assert.match(source, /estimated_first_charge_cents/);
  assert.match(source, /Regular \{regularEstimate\}/);
  assert.doesNotMatch(source, /<td className="p-3">See account<\/td>/);
});

test("password reset distinguishes same-password rejection from an expired recovery link", async () => {
  const source = await readFile(resetPath, "utf8");
  assert.match(source, /same_password/);
  assert.match(source, /different from your current password/);
  assert.match(source, /response\.status === 401 \|\| response\.status === 403/);
});

test("trusted service role can pass portal activation guards and maintain contact preferences", async () => {
  const source = await readFile(migrationPath, "utf8");
  assert.match(source, /grant execute on function public\.has_role\(public\.app_role\) to service_role/i);
  assert.match(source, /grant select, insert, update on table public\.customer_contact_preferences to service_role/i);
});
