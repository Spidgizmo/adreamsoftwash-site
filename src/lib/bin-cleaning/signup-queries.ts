import { databaseRequest } from "@/lib/supabase/server";

export type SignupLeadRow = Readonly<{
  id: string;
  status: "incomplete" | "abandoned" | "submitted_unpaid";
  full_name: string | null;
  email: string | null;
  phone: string | null;
  line1: string | null;
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
  discount_kind: string;
  discount_status: string;
  estimated_first_charge_cents: number | null;
  last_activity_at: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}>;

export type SignupLeadResult = Readonly<{
  available: boolean;
  leads: readonly SignupLeadRow[];
}>;

export async function crmSignupLeads(): Promise<SignupLeadResult> {
  try {
    const leads = await databaseRequest<SignupLeadRow[]>(
      "signup_leads?select=id,status,full_name,email,phone,line1,city,region,postal_code,plan_id,bin_count,bin_streams,trash_weekday,recycling_weekday,recycling_frequency_weeks,recycling_anchor_collection_date,promo_code,referral_code,preferred_return_location,access_instructions,gate_information,animal_warning,safety_notes,discount_kind,discount_status,estimated_first_charge_cents,last_activity_at,submitted_at,created_at,updated_at&order=last_activity_at.desc&limit=100",
    );
    return { available: true, leads };
  } catch {
    return { available: false, leads: [] };
  }
}
