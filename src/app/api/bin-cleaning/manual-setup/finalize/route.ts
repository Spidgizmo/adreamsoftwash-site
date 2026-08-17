import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isStagingEnvironment } from "@/lib/app-environment";
import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const ALLOWED_PLANS = new Set(["monthly", "quarterly", "twice-yearly", "one-time"]);

type ManualSignupLead = {
  id: string;
  edit_token_hash: string;
  status: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  line1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  plan_id: string | null;
  bin_count: number;
  bin_streams: { trash?: number; recycling?: number; other?: number } | null;
  trash_weekday: number | null;
  recycling_weekday: number | null;
  recycling_frequency_weeks: number | null;
  recycling_anchor_collection_date: string | null;
  preferred_return_location: string | null;
  email_allowed: boolean;
  sms_allowed: boolean;
  phone_allowed: boolean;
  terms_accepted: boolean;
  auth_user_id: string | null;
  form_data: Record<string, unknown> | null;
  is_test: boolean;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function tokenMatches(editToken: string, expectedHash: string) {
  const actual = createHash("sha256").update(editToken).digest("hex");
  if (actual.length !== expectedHash.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expectedHash));
}
function weekdayIsStandard(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 5;
}

export async function POST(request: NextRequest) {
  if (!isStagingEnvironment()) {
    return NextResponse.json({ ok: false, error: "Customer setup is available only in staging." }, { status: 404, headers: HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Setup request must be valid JSON." }, { status: 400, headers: HEADERS });
  }
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const leadId = text(input.leadId);
  const editToken = text(input.editToken);
  const emailAllowed = input.emailAllowed === true;
  const smsAllowed = input.smsAllowed === true;
  const phoneAllowed = input.phoneAllowed === true;
  const termsAccepted = input.termsAccepted === true;

  if (!/^[0-9a-f-]{36}$/i.test(leadId) || editToken.length < 32) {
    return NextResponse.json({ ok: false, error: "This setup link is incomplete or invalid." }, { status: 400, headers: HEADERS });
  }
  if (!emailAllowed || !smsAllowed || !phoneAllowed) {
    return NextResponse.json({ ok: false, error: "Required service communication permissions must be accepted before checkout." }, { status: 400, headers: HEADERS });
  }
  if (!termsAccepted) {
    return NextResponse.json({ ok: false, error: "Service and payment terms must be accepted before checkout." }, { status: 400, headers: HEADERS });
  }

  const rows = await serviceRoleDatabaseRequest<ManualSignupLead[]>(
    `signup_leads?id=eq.${encodeURIComponent(leadId)}&select=id,edit_token_hash,status,full_name,email,phone,line1,city,region,postal_code,plan_id,bin_count,bin_streams,trash_weekday,recycling_weekday,recycling_frequency_weeks,recycling_anchor_collection_date,preferred_return_location,email_allowed,sms_allowed,phone_allowed,terms_accepted,auth_user_id,form_data,is_test&limit=1`,
  ).catch(() => []);
  const lead = rows[0];
  if (!lead?.is_test || lead.form_data?.manual_intake !== true || !tokenMatches(editToken, lead.edit_token_hash)) {
    return NextResponse.json({ ok: false, error: "This setup link could not be verified." }, { status: 403, headers: HEADERS });
  }
  if (lead.status === "converted") {
    return NextResponse.json({ ok: false, error: "This signup has already been converted to a customer account." }, { status: 409, headers: HEADERS });
  }
  if (!lead.auth_user_id) {
    return NextResponse.json({ ok: false, error: "Create the customer portal password before finalizing setup." }, { status: 409, headers: HEADERS });
  }
  if (lead.status === "submitted_unpaid") {
    if (lead.email_allowed && lead.sms_allowed && lead.phone_allowed && lead.terms_accepted) {
      return NextResponse.json({ ok: true, submitted: true }, { headers: HEADERS });
    }
    return NextResponse.json({ ok: false, error: "This submitted signup is locked and is missing required setup confirmations. Staff review is required." }, { status: 409, headers: HEADERS });
  }
  if (!lead.full_name || !lead.email || !lead.phone || !lead.line1 || !lead.city || !lead.region || !lead.postal_code || !lead.preferred_return_location) {
    return NextResponse.json({ ok: false, error: "Staff intake is missing required customer or service-address information." }, { status: 409, headers: HEADERS });
  }
  if (!lead.plan_id || !ALLOWED_PLANS.has(lead.plan_id) || !Number.isInteger(lead.bin_count) || lead.bin_count < 1) {
    return NextResponse.json({ ok: false, error: "Staff intake is missing a valid plan or bin count." }, { status: 409, headers: HEADERS });
  }
  if (!weekdayIsStandard(lead.trash_weekday)) {
    return NextResponse.json({ ok: false, error: "Staff intake needs a Monday through Friday trash pickup day." }, { status: 409, headers: HEADERS });
  }
  const recyclingBins = Number(lead.bin_streams?.recycling ?? 0);
  if (recyclingBins > 0 && (!weekdayIsStandard(lead.recycling_weekday) || ![1, 2].includes(lead.recycling_frequency_weeks ?? 0) || !lead.recycling_anchor_collection_date)) {
    return NextResponse.json({ ok: false, error: "Recycling service is missing its pickup day, frequency, or anchor date." }, { status: 409, headers: HEADERS });
  }

  const now = new Date().toISOString();
  const formData = {
    ...(lead.form_data ?? {}),
    customer_setup_completed: true,
    customer_setup_completed_at: now,
    terms_version: "ads-bin-cleaning-service-payment-v1",
    terms_accepted_at: now,
  };

  try {
    await serviceRoleDatabaseRequest(`signup_leads?id=eq.${encodeURIComponent(lead.id)}&status=neq.submitted_unpaid`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "submitted_unpaid",
        email_allowed: true,
        sms_allowed: true,
        phone_allowed: true,
        terms_accepted: true,
        form_data: formData,
        submitted_at: now,
        last_activity_at: now,
        updated_at: now,
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "The completed setup could not be locked for checkout. Try again." }, { status: 500, headers: HEADERS });
  }

  return NextResponse.json({ ok: true, submitted: true }, { headers: HEADERS });
}
