import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  BIN_CLEANING_PLANS,
  calculateBinCleaningPrice,
} from "@/lib/bin-cleaning-plans";
import { currentSession } from "@/lib/supabase/server";

export const runtime = "nodejs";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function integer(form: FormData, key: string) {
  const value = Number(text(form, key));
  return Number.isSafeInteger(value) ? value : Number.NaN;
}
function redirect(request: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/bin-cleaning/crm/customers/new?${query}`, request.url), 303);
}
function wantsJson(request: NextRequest) {
  return request.headers.get("x-ads-manual-intake") === "1";
}
function fail(request: NextRequest, error: string, status = 400, fieldErrors?: Record<string, string>) {
  if (wantsJson(request)) return NextResponse.json({ ok: false, error, fieldErrors }, { status });
  return redirect(request, `error=${encodeURIComponent(error)}`);
}
function dateWeekday(dateValue: string | null) {
  if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const parsed = new Date(`${dateValue}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getUTCDay();
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || !["administrator", "dispatcher"].includes(session.role)) {
    return NextResponse.json({ ok: false, error: "Staff access required" }, { status: 403 });
  }

  const form = await request.formData();
  const fullName = text(form, "full_name").slice(0, 120);
  const email = text(form, "email").toLowerCase().slice(0, 180);
  const phone = text(form, "phone").slice(0, 32);
  const line1 = text(form, "line1").slice(0, 180);
  const line2 = text(form, "line2").slice(0, 80);
  const city = text(form, "city").slice(0, 100);
  const region = text(form, "region").toUpperCase().slice(0, 32);
  const postalCode = text(form, "postal_code").slice(0, 32);
  const planId = text(form, "plan_id");
  const trashBins = integer(form, "trash_bins");
  const recyclingBins = integer(form, "recycling_bins");
  const trashWeekday = integer(form, "trash_weekday");
  const recyclingWeekday = integer(form, "recycling_weekday");
  const recyclingFrequencyWeeks = integer(form, "recycling_frequency_weeks");
  const recyclingAnchor = text(form, "recycling_anchor_collection_date") || null;
  const preferredReturnLocation = text(form, "preferred_return_location").slice(0, 180);
  const accessInstructions = text(form, "access_instructions").slice(0, 1000);
  const gateInformation = text(form, "gate_information").slice(0, 500);
  const animalWarning = text(form, "animal_warning").slice(0, 500);
  const staffNote = text(form, "staff_note").slice(0, 1500);
  const binCount = trashBins + recyclingBins;
  const plan = BIN_CLEANING_PLANS.find((item) => item.id === planId && item.publiclyVisible);
  const fieldErrors: Record<string, string> = {};

  if (!fullName) fieldErrors.full_name = "Enter a customer name.";
  if (!email) fieldErrors.email = "Enter an email value.";
  if (!phone) fieldErrors.phone = "Enter a phone value.";
  if (!line1) fieldErrors.line1 = "Enter the service street address.";
  if (!city) fieldErrors.city = "Enter the city.";
  if (!region) fieldErrors.region = "Enter the state.";
  if (!postalCode) fieldErrors.postal_code = "Enter the ZIP code.";
  if (!plan) fieldErrors.plan_id = "Choose a valid service plan.";
  if (!Number.isInteger(trashBins) || trashBins < 0) fieldErrors.trash_bins = "Enter 0 or more trash bins.";
  if (!Number.isInteger(recyclingBins) || recyclingBins < 0) fieldErrors.recycling_bins = "Enter 0 or more recycling bins.";
  if (!fieldErrors.trash_bins && !fieldErrors.recycling_bins && binCount < 1) {
    fieldErrors.trash_bins = "At least one total bin is required.";
    fieldErrors.recycling_bins = "At least one total bin is required.";
  }
  if (!Number.isInteger(trashWeekday) || trashWeekday < 0 || trashWeekday > 6) fieldErrors.trash_weekday = "Choose the trash pickup day.";
  if (recyclingBins > 0) {
    if (!Number.isInteger(recyclingWeekday) || recyclingWeekday < 0 || recyclingWeekday > 6) fieldErrors.recycling_weekday = "Choose the recycling pickup day.";
    if (![1, 2].includes(recyclingFrequencyWeeks)) fieldErrors.recycling_frequency_weeks = "Choose the recycling frequency.";
    if (recyclingAnchor) {
      const actualWeekday = dateWeekday(recyclingAnchor);
      if (actualWeekday === null) {
        fieldErrors.recycling_anchor_collection_date = "Enter a valid recycling pickup date.";
      } else if (!fieldErrors.recycling_weekday && actualWeekday !== recyclingWeekday) {
        fieldErrors.recycling_anchor_collection_date = `That date is a ${days[actualWeekday]}, but the recycling pickup day is set to ${days[recyclingWeekday]}. Change the date or pickup day.`;
      }
    }
  }
  if (!preferredReturnLocation) fieldErrors.preferred_return_location = "Enter where ADS should return the bins.";

  if (Object.keys(fieldErrors).length > 0) {
    return fail(request, "Please fix the fields marked in red. Your entries have been kept.", 400, fieldErrors);
  }
  if (!plan) return fail(request, "Choose a valid service plan.", 400, { plan_id: "Choose a valid service plan." });

  const price = calculateBinCleaningPrice(plan, binCount);
  if (!price) return fail(request, "The selected plan and bin count could not be priced. Your entries have been kept.", 400);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return fail(request, "The staging database connection is unavailable. Your entries have been kept.", 503);

  const now = new Date().toISOString();
  const editTokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const payload = {
    edit_token_hash: editTokenHash,
    status: "submitted_unpaid",
    full_name: fullName,
    email,
    phone,
    line1,
    line2: line2 || null,
    city,
    region,
    postal_code: postalCode,
    plan_id: plan.id,
    bin_count: binCount,
    bin_streams: { trash: trashBins, recycling: recyclingBins, other: 0 },
    trash_weekday: trashWeekday,
    recycling_weekday: recyclingBins > 0 ? recyclingWeekday : null,
    recycling_frequency_weeks: recyclingBins > 0 ? recyclingFrequencyWeeks : null,
    recycling_anchor_collection_date: recyclingBins > 0 ? recyclingAnchor : null,
    preferred_return_location: preferredReturnLocation,
    access_instructions: accessInstructions || null,
    gate_information: gateInformation || null,
    animal_warning: animalWarning || null,
    safety_notes: null,
    email_allowed: true,
    sms_allowed: true,
    phone_allowed: true,
    terms_accepted: true,
    source_path: "/bin-cleaning/crm/manual-customer",
    estimated_subtotal_cents: price.subtotalCents,
    estimated_discount_cents: 0,
    estimated_first_charge_cents: price.subtotalCents,
    discount_kind: "none",
    discount_status: "none",
    form_data: { entered_by_staff_user_id: session.id, staff_note: staffNote || null, manual_intake: true },
    is_test: true,
    last_activity_at: now,
    submitted_at: now,
    updated_at: now,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/signup_leads`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!response?.ok) return fail(request, "The server could not save the customer. Your entries have been kept so you can correct or retry without starting over.", 500);
  if (wantsJson(request)) return NextResponse.json({ ok: true });
  return redirect(request, "saved=1");
}
