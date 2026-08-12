import { databaseRequest } from "@/lib/supabase/server";

export type SignupLeadRow = Readonly<{
  id: string;
  status: "incomplete" | "abandoned" | "submitted_unpaid";
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
  bin_streams: {
    trash?: number;
    recycling?: number;
    other?: number;
  };
  trash_weekday: number | null;
  recycling_weekday: number | null;
  recycling_frequency_weeks: number | null;
  recycling_anchor_collection_date: string | null;
  promo_code: string | null;
  referral_code: string | null;
  preferred_return_location: string | null;
  access_instructions: string | null;
  gate_information: string | null;
  animal_warning: string | null;
  safety_notes: string | null;
  email_allowed: boolean;
  sms_allowed: boolean;
  phone_allowed: boolean;
  terms_accepted: boolean;
  source_path: string;
  form_data: Record<string, unknown> | null;
  estimated_subtotal_cents: number | null;
  estimated_discount_cents: number;
  estimated_first_charge_cents: number | null;
  discount_kind: string;
  discount_status: string;
  is_test: boolean;
  last_activity_at: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}>;

export type SignupLeadResult = Readonly<{
  available: boolean;
  leads: readonly SignupLeadRow[];
}>;

const SIGNUP_LEAD_SELECT =
  "id,status,full_name,email,phone,line1,line2,city,region,postal_code,plan_id,bin_count,bin_streams,trash_weekday,recycling_weekday,recycling_frequency_weeks,recycling_anchor_collection_date,promo_code,referral_code,preferred_return_location,access_instructions,gate_information,animal_warning,safety_notes,email_allowed,sms_allowed,phone_allowed,terms_accepted,source_path,form_data,estimated_subtotal_cents,estimated_discount_cents,estimated_first_charge_cents,discount_kind,discount_status,is_test,last_activity_at,submitted_at,created_at,updated_at";

export async function crmSignupLeads(): Promise<SignupLeadResult> {
  try {
    const leads = await databaseRequest<SignupLeadRow[]>(
      `signup_leads?select=${SIGNUP_LEAD_SELECT}&order=last_activity_at.desc&limit=100`,
    );
    return { available: true, leads };
  } catch {
    return { available: false, leads: [] };
  }
}

export async function crmSignupLead(id: string): Promise<SignupLeadRow | null> {
  const safeId = encodeURIComponent(id);
  const leads = await databaseRequest<SignupLeadRow[]>(
    `signup_leads?select=${SIGNUP_LEAD_SELECT}&id=eq.${safeId}&limit=1`,
  );
  return leads[0] ?? null;
}
