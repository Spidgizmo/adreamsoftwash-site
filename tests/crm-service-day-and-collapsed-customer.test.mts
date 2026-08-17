import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const crmPath = new URL("../src/app/bin-cleaning/crm/page.tsx", import.meta.url);
const customerPath = new URL("../src/app/bin-cleaning/crm/customers/[id]/page.tsx", import.meta.url);
const manualFormPath = new URL("../src/app/bin-cleaning/crm/customers/new/ManualCustomerForm.tsx", import.meta.url);
const manualRoutePath = new URL("../src/app/api/bin-cleaning/crm/manual-customer/route.ts", import.meta.url);
const historyPath = new URL("../src/components/bin-cleaning/CustomerHistoryPanels.tsx", import.meta.url);

test("CRM exposes pickup and clean day separately and normal pickup filters are weekdays only", async () => {
  const crm = await readFile(crmPath, "utf8");
  assert.match(crm, /standardPickupDays = days\.map[\s\S]*index>=1&&index<=5/);
  assert.match(crm, /"Pickup day","Clean day"/);
  assert.match(crm, /clean=p\?\.cleaning_day_assignments\[0\]\?\.normal_weekday/);
  assert.match(crm, /standardPickupDays\.map\(\(\{day,index\}\)=>/);
  assert.doesNotMatch(crm, /<option value="">All pickup days<\/option>\{days\.map/);
});

test("manual customer intake rejects weekend municipality pickup days on client and server", async () => {
  const [form, route] = await Promise.all([
    readFile(manualFormPath, "utf8"),
    readFile(manualRoutePath, "utf8"),
  ]);
  assert.match(form, /trashWeekday < 1 \|\| trashWeekday > 5/);
  assert.match(form, /recyclingWeekday < 1 \|\| recyclingWeekday > 5/);
  assert.match(form, /standardPickupDays\.map/);
  assert.match(route, /trashWeekday < 1 \|\| trashWeekday > 5/);
  assert.match(route, /recyclingWeekday < 1 \|\| recyclingWeekday > 5/);
});

test("customer CRM keeps only summary and pending review open by default", async () => {
  const [customer, history] = await Promise.all([
    readFile(customerPath, "utf8"),
    readFile(historyPath, "utf8"),
  ]);
  assert.match(customer, /<Definition label="Pickup day">/);
  assert.match(customer, /<Definition label="Clean day">/);
  assert.match(customer, /<details className="card mt-5 p-5"><summary[\s\S]*Referral & billing snapshot/);
  assert.match(customer, /<details className="card mt-5 p-5"><summary[\s\S]*Customer account & service details/);
  assert.match(customer, /<details className="card mt-5 p-5"><summary[\s\S]*Staff notes/);
  assert.doesNotMatch(history, /<details className="card mt-5" open>/);
  assert.match(customer, /<h3 className="font-black">Pending staff review<\/h3>/);
});
