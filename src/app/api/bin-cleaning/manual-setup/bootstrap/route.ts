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

type ManualSignupLead = {
  id: string;
  edit_token_hash: string;
  status: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
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
  access_instructions: string | null;
  gate_information: string | null;
  animal_warning: string | null;
  safety_notes: string | null;
  email_allowed: boolean;
  sms_allowed: boolean;
  phone_allowed: boolean;
  terms_accepted: boolean;
  estimated_subtotal_cents: number | null;
  estimated_first_charge_cents: number | null;
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
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || editToken.length < 32) {
    return NextResponse.json({ ok: false, error: "This setup link is incomplete or invalid." }, { status: 400, headers: HEADERS });
  }

  const rows = await serviceRoleDatabaseRequest<ManualSignupLead[]>(
    `signup_leads?id=eq.${encodeURIComponent(leadId)}&select=id,edit_token_hash,status,full_name,email,phone,line1,line2,city,region,postal_code,plan_id,bin_count,bin_streams,trash_weekday,recycling_weekday,recycling_frequency_weeks,recycling_anchor_collection_date,preferred_return_location,access_instructions,gate_information,animal_warning,safety_notes,email_allowed,sms_allowed,phone_allowed,terms_accepted,estimated_subtotal_cents,estimated_first_charge_cents,auth_user_id,form_data,is_test&limit=1`,
  ).catch(() => []);
  const lead = rows[0];
  const manualIntake = lead?.form_data?.manual_intake === true;
  if (!lead?.is_test || !manualIntake || !tokenMatches(editToken, lead.edit_token_hash)) {
    return NextResponse.json({ ok: false, error: "This setup link could not be verified." }, { status: 403, headers: HEADERS });
  }

  const setupState = lead.status === "converted"
    ? "converted"
    : lead.status === "submitted_unpaid"
      ? "submitted_unpaid"
      : "pending_customer_setup";

  return NextResponse.json({
    ok: true,
    setupState,
    lead: {
      id: lead.id,
      status: lead.status,
      fullName: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      line1: lead.line1,
      line2: lead.line2,
      city: lead.city,
      region: lead.region,
      postalCode: lead.postal_code,
      planId: lead.plan_id,
      binCount: lead.bin_count,
      binStreams: lead.bin_streams ?? { trash: 0, recycling: 0, other: 0 },
      trashWeekday: lead.trash_weekday,
      recyclingWeekday: lead.recycling_weekday,
      recyclingFrequencyWeeks: lead.recycling_frequency_weeks,
      recyclingAnchorCollectionDate: lead.recycling_anchor_collection_date,
      preferredReturnLocation: lead.preferred_return_location,
      accessInstructions: lead.access_instructions,
      gateInformation: lead.gate_information,
      animalWarning: lead.animal_warning,
      safetyNotes: lead.safety_notes,
      emailAllowed: lead.email_allowed,
      smsAllowed: lead.sms_allowed,
      phoneAllowed: lead.phone_allowed,
      termsAccepted: lead.terms_accepted,
      estimatedSubtotalCents: lead.estimated_subtotal_cents,
      estimatedFirstChargeCents: lead.estimated_first_charge_cents,
      portalIdentityPrepared: Boolean(lead.auth_user_id),
    },
  }, { headers: HEADERS });
}
