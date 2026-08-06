export type RecyclingSchedule = Readonly<{
  weekday: number;
  frequencyWeeks: number;
  anchorCollectionDate: string;
}>;

export type EligibleServiceResult =
  | Readonly<{
      status: "scheduled";
      alignment: "trash_collection" | "recycling_collection";
      collectionDate: string;
      cleaningDate: string;
    }>
  | Readonly<{
      status: "staff_review_required";
      reason:
        | "missing_recycling_schedule"
        | "trash_and_recycling_days_differ"
        | "invalid_schedule";
    }>;

export const RECYCLING_ALIGNMENT_EXPLANATION =
  "When a recycling cart is included, service is scheduled after a recycling collection so the trash and recycling carts are expected to be empty and available. Because recycling may be collected every other week, the first cleaning may be later than the next trash pickup.";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function nextWeekdayOnOrAfter(fromDate: Date, weekday: number): Date {
  const daysUntil = (weekday - fromDate.getUTCDay() + 7) % 7;
  return addDays(fromDate, daysUntil);
}

function nextAnchoredCollectionOnOrAfter(
  fromDate: Date,
  schedule: RecyclingSchedule,
): Date | null {
  const anchor = parseDateOnly(schedule.anchorCollectionDate);
  if (
    !anchor ||
    schedule.weekday < 0 ||
    schedule.weekday > 6 ||
    schedule.frequencyWeeks < 1 ||
    schedule.frequencyWeeks > 4 ||
    anchor.getUTCDay() !== schedule.weekday
  ) {
    return null;
  }

  if (fromDate.getTime() <= anchor.getTime()) return anchor;

  const intervalDays = schedule.frequencyWeeks * 7;
  const daysAfterAnchor = Math.floor(
    (fromDate.getTime() - anchor.getTime()) / DAY_MS,
  );
  const intervals = Math.ceil(daysAfterAnchor / intervalDays);
  return addDays(anchor, intervals * intervalDays);
}

export function calculateNextEligibleService(input: {
  signupDate: string;
  trashWeekday: number;
  includesRecyclingBin: boolean;
  recyclingSchedule?: RecyclingSchedule | null;
}): EligibleServiceResult {
  const signupDate = parseDateOnly(input.signupDate);
  if (!signupDate || input.trashWeekday < 0 || input.trashWeekday > 6) {
    return { status: "staff_review_required", reason: "invalid_schedule" };
  }

  if (!input.includesRecyclingBin) {
    const collectionDate = nextWeekdayOnOrAfter(
      signupDate,
      input.trashWeekday,
    );
    return {
      status: "scheduled",
      alignment: "trash_collection",
      collectionDate: formatDateOnly(collectionDate),
      cleaningDate: formatDateOnly(addDays(collectionDate, 1)),
    };
  }

  const recycling = input.recyclingSchedule;
  if (!recycling) {
    return {
      status: "staff_review_required",
      reason: "missing_recycling_schedule",
    };
  }

  if (recycling.weekday !== input.trashWeekday) {
    return {
      status: "staff_review_required",
      reason: "trash_and_recycling_days_differ",
    };
  }

  const collectionDate = nextAnchoredCollectionOnOrAfter(
    signupDate,
    recycling,
  );
  if (!collectionDate) {
    return { status: "staff_review_required", reason: "invalid_schedule" };
  }

  return {
    status: "scheduled",
    alignment: "recycling_collection",
    collectionDate: formatDateOnly(collectionDate),
    cleaningDate: formatDateOnly(addDays(collectionDate, 1)),
  };
}
