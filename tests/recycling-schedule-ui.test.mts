import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const signupPath = new URL(
  "../src/app/bin-cleaning/signup/page.tsx",
  import.meta.url,
);
const portalPath = new URL(
  "../src/app/bin-cleaning/portal/page.tsx",
  import.meta.url,
);
const portalRoutePath = new URL(
  "../src/app/api/bin-cleaning/portal/route.ts",
  import.meta.url,
);

test("signup preview collects enough information to identify alternating recycling weeks", async () => {
  const signup = await readFile(signupPath, "utf8");

  assert.match(signup, /Which bins are being cleaned: trash, recycling, or other/);
  assert.match(signup, /Recycling pickup day/);
  assert.match(signup, /Recycling frequency: weekly or every other week/);
  assert.match(signup, /Next scheduled recycling pickup date/);
  assert.match(signup, /weekday alone is insufficient/);
  assert.match(signup, /first cleaning may be later than the next trash pickup/);
});

test("portal displays recycling cadence and accepts a staff-reviewed correction", async () => {
  const [portal, route] = await Promise.all([
    readFile(portalPath, "utf8"),
    readFile(portalRoutePath, "utf8"),
  ]);

  assert.match(portal, /Recycling pickup/);
  assert.match(portal, /Recycling schedule correction/);
  assert.match(portal, /recycling_weekday/);
  assert.match(portal, /recycling_frequency_weeks/);
  assert.match(portal, /recycling_next_collection_date/);
  assert.match(portal, /Staff must verify the request before it changes routing/);

  assert.match(route, /request_type: "recycling_schedule"/);
  assert.match(route, /next_collection_date: recyclingDate/);
  assert.match(route, /actualWeekday !== recyclingWeekday/);
});
