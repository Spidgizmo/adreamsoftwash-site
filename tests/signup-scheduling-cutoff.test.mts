import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { calculateNextEligibleService } from "../src/lib/bin-cleaning/scheduling.ts";

const signupFormPath = new URL(
  "../src/components/bin-cleaning/BinCleaningSignupForm.tsx",
  import.meta.url,
);
const signupValidationPath = new URL(
  "../src/lib/bin-cleaning/signup.ts",
  import.meta.url,
);
const weekdayMigrationPath = new URL(
  "../supabase/migrations/202608160008_standard_pickup_weekdays.sql",
  import.meta.url,
);
const profilePermissionMigrationPath = new URL(
  "../supabase/migrations/202608160007_signup_account_profile_permissions.sql",
  import.meta.url,
);

test("Sunday signup can use Monday pickup and Tuesday cleaning", () => {
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-16",
      trashWeekday: 1,
      includesRecyclingBin: false,
    }),
    {
      status: "scheduled",
      alignment: "trash_collection",
      collectionDate: "2026-08-17",
      cleaningDate: "2026-08-18",
    },
  );
});

test("signup on the normal pickup day defers to the following collection cycle", () => {
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-17",
      trashWeekday: 1,
      includesRecyclingBin: false,
    }),
    {
      status: "scheduled",
      alignment: "trash_collection",
      collectionDate: "2026-08-24",
      cleaningDate: "2026-08-25",
    },
  );
});

test("a recycling pickup tomorrow remains eligible", () => {
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-16",
      trashWeekday: 1,
      includesRecyclingBin: true,
      recyclingSchedule: {
        weekday: 1,
        frequencyWeeks: 2,
        anchorCollectionDate: "2026-08-17",
      },
    }),
    {
      status: "scheduled",
      alignment: "recycling_collection",
      collectionDate: "2026-08-17",
      cleaningDate: "2026-08-18",
    },
  );
});

test("Saturday and Sunday are invalid normal pickup weekdays", () => {
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-16",
      trashWeekday: 0,
      includesRecyclingBin: false,
    }),
    { status: "staff_review_required", reason: "invalid_schedule" },
  );
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-16",
      trashWeekday: 6,
      includesRecyclingBin: false,
    }),
    { status: "staff_review_required", reason: "invalid_schedule" },
  );
});

test("signup UI and trusted validation expose only Monday through Friday", async () => {
  const [form, validation, migration] = await Promise.all([
    readFile(signupFormPath, "utf8"),
    readFile(signupValidationPath, "utf8"),
    readFile(weekdayMigrationPath, "utf8"),
  ]);

  assert.match(form, /STANDARD_PICKUP_WEEKDAYS = \[1, 2, 3, 4, 5\]/);
  assert.match(form, /while \(daysBetween\(today, collection\) <= 0\)/);
  assert.match(form, /const deferred = delta === 0/);
  assert.match(form, /signup occurred on the normal collection day/);
  assert.match(validation, /must be Monday through Friday/);
  assert.match(migration, /weekday between 1 and 5/);
});

test("staging service role can create the pending customer profile", async () => {
  const migration = await readFile(profilePermissionMigrationPath, "utf8");
  assert.match(
    migration,
    /grant select, insert, update on public\.user_profiles to service_role;/,
  );
});
