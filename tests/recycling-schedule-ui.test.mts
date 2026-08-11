import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const signupFormPath = new URL(
  "../src/components/bin-cleaning/BinCleaningSignupForm.tsx",
  import.meta.url,
);
const schedulingPath = new URL(
  "../src/lib/bin-cleaning/scheduling.ts",
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

test("working signup collects enough information to identify alternating recycling weeks", async () => {
  const [signup, scheduling] = await Promise.all([
    readFile(signupFormPath, "utf8"),
    readFile(schedulingPath, "utf8"),
  ]);

  assert.match(signup, /Trash bins/);
  assert.match(signup, /Recycling bins/);
  assert.doesNotMatch(signup, /Other carts/);
  assert.match(signup, /other: 0/);
  assert.match(signup, /Recycling pickup day/);
  assert.match(signup, /Recycling frequency/);
  assert.match(signup, /Next scheduled recycling pickup date/);
  assert.match(signup, /Every-other-week service needs an exact next pickup date as its anchor/);
  assert.match(signup, /staff scheduling review instead of automatic assignment/);
  assert.match(scheduling, /later than the next trash pickup/);
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
  assert.match(
    portal,
    /Staff must verify the request before it\s+changes routing/,
  );

  assert.match(route, /request_type: "recycling_schedule"/);
  assert.match(route, /next_collection_date: recyclingDate/);
  assert.match(route, /actualWeekday !== recyclingWeekday/);
});
