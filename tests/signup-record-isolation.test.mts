import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const formPath = new URL("../src/components/bin-cleaning/BinCleaningSignupForm.tsx", import.meta.url);
const crmPath = new URL("../src/app/bin-cleaning/crm/page.tsx", import.meta.url);
const detailPath = new URL("../src/app/bin-cleaning/crm/signups/[id]/page.tsx", import.meta.url);

test("submitted fictional signup releases its edit identity so the next signup cannot overwrite it", async () => {
  const source = await readFile(formPath, "utf8");
  assert.match(source, /ads-bin-cleaning-fictional-signup-v2/);
  assert.match(source, /window\.localStorage\.removeItem\(STORAGE_KEY\)/);
  assert.match(source, /leadRef\.current = null/);
  assert.match(source, /setLead\(null\)/);
  assert.match(source, /Start another fictional signup/);
  assert.match(source, /Starting another signup will create a new record instead of changing this customer/);
});

test("CRM signup pipeline stays compact and links to a separate detail page", async () => {
  const source = await readFile(crmPath, "utf8");
  assert.match(source, /crm\/signups\/\$\{lead\.id\}/);
  assert.match(source, /Compact intake list/);
  assert.doesNotMatch(source, /<details/);
});

test("signup detail distinguishes the new-customer discount from the referrer reward", async () => {
  const source = await readFile(detailPath, "utf8");
  assert.match(source, /New referred Monthly customer — 50% off first eligible base cleaning/);
  assert.match(source, /referrer reward is calculated separately/);
});
