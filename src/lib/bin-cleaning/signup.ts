import {
  MAX_BIN_COUNT,
  PUBLIC_BIN_CLEANING_PLANS,
  calculateBinCleaningPrice,
  evaluateBinCleaningPromotion,
  isPlausibleBinCleaningReferralCode,
  normalizeBinCleaningPromoCode,
  normalizeBinCleaningReferralCode,
  type PlanId,
} from "@/lib/bin-cleaning-plans";

export const SIGNUP_LEAD_STATUSES = [
  "incomplete",
  "abandoned",
  "submitted_unpaid",
] as const;
export type SignupLeadStatus = (typeof SIGNUP_LEAD_STATUSES)[number];

export type SignupLeadPayload = Readonly<{
  fictionalDataConfirmed: boolean;
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  planId: PlanId | "";
  binStreams: Readonly<{
    trash: number;
    recycling: number;
    other: number;
  }>;
  trashWeekday: number | null;
  recyclingWeekday: number | null;
  recyclingFrequencyWeeks: 1 | 2 | null;
  recyclingAnchorCollectionDate: string;
  promoCode: string;
  referralCode: string;
  preferredReturnLocation: string;
  accessInstructions: string;
  gateInformation: string;
  animalWarning: string;
  safetyNotes: string;
  emailAllowed: boolean;
  smsAllowed: boolean;
  phoneAllowed: boolean;
  termsAccepted: boolean;
  sourcePath: string;
}>;

export type SignupLeadRequest = Readonly<{
  leadId: string | null;
  editToken: string | null;
  status: SignupLeadStatus;
  payload: SignupLeadPayload;
  estimate: Readonly<{
    subtotalCents: number | null;
    discountCents: number;
    firstChargeCents: number | null;
    discountKind: "none" | "promotion" | "referral";
    discountStatus: "none" | "pending" | "applied" | "invalid" | "ineligible";
  }>;
}>;

export type SignupLeadValidation =
  | Readonly<{ ok: true; value: SignupLeadRequest }>
  | Readonly<{ ok: false; errors: readonly string[] }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const POSTAL_CODE = /^\d{5}(?:-\d{4})?$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(
  value: unknown,
  label: string,
  errors: string[],
  maximumLength: number,
): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    errors.push(`${label} must be text.`);
    return "";
  }
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    errors.push(`${label} must be ${maximumLength} characters or fewer.`);
  }
  return normalized.slice(0, maximumLength);
}

function boolean(value: unknown): boolean {
  return value === true;
}

function count(value: unknown, label: string, errors: string[]): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_BIN_COUNT) {
    errors.push(`${label} must be a whole number from 0 to ${MAX_BIN_COUNT}.`);
    return 0;
  }
  return parsed;
}

function weekday(value: unknown, label: string, errors: string[]): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    errors.push(`${label} must be a valid weekday.`);
    return null;
  }
  return parsed;
}

function validDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizedTestPhone(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function validateSignupLeadRequest(input: unknown): SignupLeadValidation {
  const root = record(input);
  const rawPayload = record(root.payload);
  const rawStreams = record(rawPayload.binStreams);
  const errors: string[] = [];

  const statusCandidate = text(root.status, "Signup status", errors, 32);
  const status = SIGNUP_LEAD_STATUSES.includes(
    statusCandidate as SignupLeadStatus,
  )
    ? (statusCandidate as SignupLeadStatus)
    : null;
  if (!status) errors.push("Signup status is not valid.");

  const leadIdText = text(root.leadId, "Signup lead ID", errors, 36);
  const editTokenText = text(root.editToken, "Signup edit token", errors, 128);
  if (leadIdText && !UUID.test(leadIdText)) {
    errors.push("Signup lead ID is not valid.");
  }
  if (leadIdText && !editTokenText) {
    errors.push("An edit token is required to update an existing signup.");
  }
  if (!leadIdText && editTokenText) {
    errors.push("An edit token cannot be used without a signup lead ID.");
  }

  const fullName = text(rawPayload.fullName, "Full name", errors, 120);
  const email = text(rawPayload.email, "Email", errors, 254).toLowerCase();
  const phone = text(rawPayload.phone, "Phone", errors, 40);
  const line1 = text(rawPayload.line1, "Address line 1", errors, 160);
  const line2 = text(rawPayload.line2, "Address line 2", errors, 120);
  const city = text(rawPayload.city, "City", errors, 100);
  const region = text(rawPayload.region, "State", errors, 40).toUpperCase();
  const postalCode = text(rawPayload.postalCode, "ZIP code", errors, 10);
  const planIdText = text(rawPayload.planId, "Plan", errors, 40);
  const plan = PUBLIC_BIN_CLEANING_PLANS.find((item) => item.id === planIdText);
  if (planIdText && !plan) errors.push("The selected service plan is not available.");

  const trash = count(rawStreams.trash, "Trash bin count", errors);
  const recycling = count(
    rawStreams.recycling,
    "Recycling bin count",
    errors,
  );
  const other = count(rawStreams.other, "Other bin count", errors);
  const binCount = trash + recycling + other;
  if (binCount > MAX_BIN_COUNT) {
    errors.push(`The total bin count cannot exceed ${MAX_BIN_COUNT}.`);
  }

  const trashWeekday = weekday(
    rawPayload.trashWeekday,
    "Trash pickup day",
    errors,
  );
  const recyclingWeekday = weekday(
    rawPayload.recyclingWeekday,
    "Recycling pickup day",
    errors,
  );
  const rawFrequency = rawPayload.recyclingFrequencyWeeks;
  const recyclingFrequencyWeeks =
    rawFrequency === 1 || rawFrequency === "1"
      ? 1
      : rawFrequency === 2 || rawFrequency === "2"
        ? 2
        : null;
  if (
    rawFrequency !== undefined &&
    rawFrequency !== null &&
    rawFrequency !== "" &&
    recyclingFrequencyWeeks === null
  ) {
    errors.push("Recycling frequency must be weekly or every other week.");
  }
  const recyclingAnchorCollectionDate = text(
    rawPayload.recyclingAnchorCollectionDate,
    "Next recycling pickup date",
    errors,
    10,
  );
  if (
    recyclingAnchorCollectionDate &&
    !validDateOnly(recyclingAnchorCollectionDate)
  ) {
    errors.push("Next recycling pickup date must be a real calendar date.");
  }
  if (
    recyclingAnchorCollectionDate &&
    recyclingWeekday !== null &&
    validDateOnly(recyclingAnchorCollectionDate) &&
    new Date(`${recyclingAnchorCollectionDate}T00:00:00.000Z`).getUTCDay() !==
      recyclingWeekday
  ) {
    errors.push("Next recycling pickup date must fall on the selected recycling weekday.");
  }

  const promoCode = normalizeBinCleaningPromoCode(
    text(rawPayload.promoCode, "Promo code", errors, 32),
  );
  const referralCode = normalizeBinCleaningReferralCode(
    text(rawPayload.referralCode, "Referral code", errors, 32),
  );
  if (promoCode && referralCode) {
    errors.push("A promo code and referral code cannot be combined.");
  }
  if (referralCode && !isPlausibleBinCleaningReferralCode(referralCode)) {
    errors.push("Referral code format is not valid.");
  }
  if (referralCode && plan && !plan.referralEligible) {
    errors.push("Referral codes are available only with an eligible Monthly plan.");
  }

  if (email && !email.endsWith(".test")) {
    errors.push("Staging accepts only fictional email addresses ending in .test.");
  }
  if (phone && !/^1555\d{7}$/.test(normalizedTestPhone(phone))) {
    errors.push("Staging accepts only reserved fictional 555 phone numbers.");
  }
  if (postalCode && !POSTAL_CODE.test(postalCode)) {
    errors.push("ZIP code format is not valid.");
  }

  const preferredReturnLocation = text(
    rawPayload.preferredReturnLocation,
    "Bin return location",
    errors,
    300,
  );
  const accessInstructions = text(
    rawPayload.accessInstructions,
    "Access instructions",
    errors,
    1000,
  );
  const gateInformation = text(
    rawPayload.gateInformation,
    "Gate information",
    errors,
    500,
  );
  const animalWarning = text(
    rawPayload.animalWarning,
    "Animal information",
    errors,
    500,
  );
  const safetyNotes = text(
    rawPayload.safetyNotes,
    "Safety information",
    errors,
    1000,
  );
  const sourcePath = text(
    rawPayload.sourcePath,
    "Signup source path",
    errors,
    200,
  );

  const fictionalDataConfirmed = boolean(rawPayload.fictionalDataConfirmed);
  if (!fictionalDataConfirmed) {
    errors.push("Confirm that every value in this staging signup is fictional test data.");
  }

  if (status === "submitted_unpaid") {
    const required: [string, string][] = [
      [fullName, "Full name is required."],
      [email, "Fictional .test email is required."],
      [phone, "Fictional 555 phone number is required."],
      [line1, "Service address is required."],
      [city, "City is required."],
      [region, "State is required."],
      [postalCode, "ZIP code is required."],
      [planIdText, "Service plan is required."],
      [preferredReturnLocation, "Bin return location is required."],
    ];
    for (const [value, message] of required) if (!value) errors.push(message);
    if (binCount < 1) errors.push("At least one bin is required.");
    if (trashWeekday === null) errors.push("Trash pickup day is required.");
    if (recycling > 0) {
      if (recyclingWeekday === null) {
        errors.push("Recycling pickup day is required when recycling bins are included.");
      }
      if (recyclingFrequencyWeeks === null) {
        errors.push("Recycling frequency is required when recycling bins are included.");
      }
      if (!recyclingAnchorCollectionDate) {
        errors.push("Next recycling pickup date is required to anchor the recycling cycle.");
      }
    }
    if (!boolean(rawPayload.termsAccepted)) {
      errors.push("The fictional signup terms must be accepted before submission.");
    }
  }

  let subtotalCents: number | null = null;
  let discountCents = 0;
  let firstChargeCents: number | null = null;
  let discountKind: "none" | "promotion" | "referral" = "none";
  let discountStatus: "none" | "pending" | "applied" | "invalid" | "ineligible" =
    "none";

  if (plan && binCount > 0) {
    const price = calculateBinCleaningPrice(plan, binCount);
    subtotalCents = price?.subtotalCents ?? null;
    firstChargeCents = subtotalCents;
    if (promoCode && price) {
      const promotion = evaluateBinCleaningPromotion(
        promoCode,
        plan,
        price.subtotalCents,
        binCount,
      );
      discountKind = "promotion";
      discountStatus = promotion.status === "empty" ? "none" : promotion.status;
      discountCents = promotion.discountCents;
      firstChargeCents = promotion.firstChargeSubtotalCents;
      if (
        status === "submitted_unpaid" &&
        (promotion.status === "invalid" || promotion.status === "ineligible")
      ) {
        errors.push(
          promotion.status === "invalid"
            ? "Promo code is not recognized."
            : "Promo code is not eligible for the selected plan and bin count.",
        );
      }
    } else if (referralCode) {
      discountKind = "referral";
      discountStatus = "pending";
      if (plan.referralEligible && subtotalCents !== null) {
        discountCents = Math.round(subtotalCents * 0.5);
        firstChargeCents = subtotalCents - discountCents;
      }
    }
  }

  if (errors.length > 0 || !status) return { ok: false, errors };

  return {
    ok: true,
    value: {
      leadId: leadIdText || null,
      editToken: editTokenText || null,
      status,
      payload: {
        fictionalDataConfirmed,
        fullName,
        email,
        phone,
        line1,
        line2,
        city,
        region,
        postalCode,
        planId: (plan?.id ?? "") as PlanId | "",
        binStreams: { trash, recycling, other },
        trashWeekday,
        recyclingWeekday,
        recyclingFrequencyWeeks,
        recyclingAnchorCollectionDate,
        promoCode,
        referralCode,
        preferredReturnLocation,
        accessInstructions,
        gateInformation,
        animalWarning,
        safetyNotes,
        emailAllowed: boolean(rawPayload.emailAllowed),
        smsAllowed: boolean(rawPayload.smsAllowed),
        phoneAllowed: boolean(rawPayload.phoneAllowed),
        termsAccepted: boolean(rawPayload.termsAccepted),
        sourcePath,
      },
      estimate: {
        subtotalCents,
        discountCents,
        firstChargeCents,
        discountKind,
        discountStatus,
      },
    },
  };
}
