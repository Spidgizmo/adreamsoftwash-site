import { BIN_CLEANING_PLANS, calculateBinCleaningPrice, type PlanId } from "../bin-cleaning-plans.ts";

export const APP_ROLES = ["customer", "administrator", "dispatcher", "field_technician"] as const;
export type AppRole = (typeof APP_ROLES)[number];
export const PICKUP_DAY_SOURCES = ["official_gis", "official_address_lookup", "staff_verified", "customer_confirmed", "unverified"] as const;
export const REFERRAL_STATUSES = ["code_entered", "pending_signup", "pending_first_service", "pending_successful_payment", "seven_day_hold", "qualified", "credit_issued", "credit_applied", "rejected", "reversed"] as const;
export const VISIT_STATUSES = ["scheduled", "assigned", "en_route", "arrived", "before_photo_complete", "cleaning_in_progress", "after_photo_complete", "bins_returned", "completed", "skipped", "refused", "weather_delayed", "customer_not_ready"] as const;
export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
const DAYS: readonly Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function nextCleaningDay(pickupDay: Weekday): Weekday {
  return DAYS[(DAYS.indexOf(pickupDay) + 1) % DAYS.length];
}
export function cleaningDate(pickupDate: string, holidayShiftDays = 0): string {
  const date = new Date(`${pickupDate}T12:00:00Z`);
  if (Number.isNaN(date.valueOf()) || !Number.isInteger(holidayShiftDays) || holidayShiftDays < 0) throw new RangeError("Invalid pickup date or holiday shift.");
  date.setUTCDate(date.getUTCDate() + holidayShiftDays + 1);
  return date.toISOString().slice(0, 10);
}
export function makeReferralCode(randomBytes: Uint8Array): string {
  if (randomBytes.length < 8) throw new RangeError("At least eight random bytes are required.");
  return `ADS-${Array.from(randomBytes.slice(0, 8), (byte) => byte.toString(36).padStart(2, "0")).join("").toUpperCase()}`;
}
export function assertReferral(referrerCustomerId: string, referredCustomerId: string, referrerAddressHash: string, referredAddressHash: string) {
  if (referrerCustomerId === referredCustomerId) throw new Error("Self-referrals are not allowed.");
  if (referrerAddressHash === referredAddressHash) throw new Error("A service address may receive only one new-customer referral benefit in the lookback window.");
}
export function referralCreditCents(planId: PlanId): number {
  const plan = BIN_CLEANING_PLANS.find((item) => item.id === planId);
  if (!plan || !plan.referralEligible || plan.status !== "active") throw new Error("Plan is not referral eligible.");
  return Math.floor((calculateBinCleaningPrice(plan, 1)?.basePriceCents ?? 0) / 2);
}
export function applyReferralCredits(eligibleBaseCents: number, availableCreditsCents: number) {
  if (eligibleBaseCents < 0 || availableCreditsCents < 0) throw new RangeError("Credit values cannot be negative.");
  const appliedCents = Math.min(eligibleBaseCents, availableCreditsCents);
  return { appliedCents, remainingCents: availableCreditsCents - appliedCents };
}
export type VisitCompletion = Readonly<{ beforePhoto: boolean; cleaningConfirmed: boolean; afterPhoto: boolean; binsReturned: boolean; authorizedException: boolean }>;
export function canCompleteVisit(value: VisitCompletion) {
  return value.beforePhoto && value.cleaningConfirmed && value.afterPhoto && (value.binsReturned || value.authorizedException);
}
