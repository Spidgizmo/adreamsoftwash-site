import assert from "node:assert/strict";
import test from "node:test";
import {
  RECYCLING_ALIGNMENT_EXPLANATION,
  calculateNextEligibleService,
} from "../src/lib/bin-cleaning/scheduling.ts";

test("trash-only service uses the next trash pickup and cleans the following day", () => {
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-07",
      trashWeekday: 2,
      includesRecyclingBin: false,
    }),
    {
      status: "scheduled",
      alignment: "trash_collection",
      collectionDate: "2026-08-11",
      cleaningDate: "2026-08-12",
    },
  );
});

test("service with recycling waits for the next every-other-week recycling pickup", () => {
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-07",
      trashWeekday: 2,
      includesRecyclingBin: true,
      recyclingSchedule: {
        weekday: 2,
        frequencyWeeks: 2,
        anchorCollectionDate: "2026-08-04",
      },
    }),
    {
      status: "scheduled",
      alignment: "recycling_collection",
      collectionDate: "2026-08-18",
      cleaningDate: "2026-08-19",
    },
  );
});

test("missing recycling schedule requires staff review", () => {
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-07",
      trashWeekday: 2,
      includesRecyclingBin: true,
    }),
    {
      status: "staff_review_required",
      reason: "missing_recycling_schedule",
    },
  );
});

test("different trash and recycling weekdays require staff review", () => {
  assert.deepEqual(
    calculateNextEligibleService({
      signupDate: "2026-08-07",
      trashWeekday: 2,
      includesRecyclingBin: true,
      recyclingSchedule: {
        weekday: 4,
        frequencyWeeks: 2,
        anchorCollectionDate: "2026-08-06",
      },
    }),
    {
      status: "staff_review_required",
      reason: "trash_and_recycling_days_differ",
    },
  );
});

test("customer explanation states that recycling can delay first service", () => {
  assert.match(RECYCLING_ALIGNMENT_EXPLANATION, /after a recycling collection/);
  assert.match(RECYCLING_ALIGNMENT_EXPLANATION, /every other week/);
  assert.match(RECYCLING_ALIGNMENT_EXPLANATION, /later than the next trash pickup/);
});
