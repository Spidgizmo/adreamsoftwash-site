import { databaseRequest } from "@/lib/supabase/server";

export type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  account_status: string;
  last_portal_activity_at: string | null;
  last_portal_login_at: string | null;
  service_addresses: {
    id: string;
    is_current: boolean;
    line1: string;
    line2?: string | null;
    city: string;
    region: string;
    postal_code: string;
    preferred_return_location: string | null;
    access_instructions: string | null;
    gate_information: string | null;
    animal_warning: string | null;
    municipalities: { name: string } | null;
    trash_pickup_schedules: {
      weekday: number | null;
      source: string;
      verification_status: string;
      cleaning_day_assignments: {
        normal_weekday: number;
        cleaning_date: string | null;
      }[];
    }[];
    recycling_pickup_schedules: {
      weekday: number;
      frequency_weeks: number;
      anchor_collection_date: string;
      source: string;
      verification_status: string;
      is_current: boolean;
    }[];
  }[];
  subscriptions: {
    payment_status: string;
    subscription_status: string;
    service_status: string;
    service_alignment: string;
    service_plan_versions: {
      base_price_cents: number | null;
      additional_bin_price_cents: number | null;
      bins_included: number | null;
      service_plans: { id: string; display_name: string };
    };
  }[];
  bins?: never;
};

const customerSelect =
  "id,full_name,email,phone,account_status,last_portal_activity_at,last_portal_login_at,service_addresses(id,is_current,line1,line2,city,region,postal_code,preferred_return_location,access_instructions,gate_information,animal_warning,municipalities(name),trash_pickup_schedules(weekday,source,verification_status,cleaning_day_assignments(normal_weekday,cleaning_date)),recycling_pickup_schedules(weekday,frequency_weeks,anchor_collection_date,source,verification_status,is_current)),subscriptions(payment_status,subscription_status,service_status,service_alignment,service_plan_versions(base_price_cents,additional_bin_price_cents,bins_included,service_plans(id,display_name)))";

export async function portalCustomer() {
  const rows = await databaseRequest<CustomerRow[]>(
    `customers?select=${customerSelect}&service_addresses.is_current=eq.true&service_addresses.recycling_pickup_schedules.is_current=eq.true&subscriptions.ended_at=is.null&subscriptions.order=started_at.desc.nullslast&subscriptions.limit=1&limit=1`,
  );
  if (!rows[0]) throw new Error("No customer is linked to this test identity");
  return rows[0];
}

export type CrmCustomer = {
  id: string;
  full_name: string;
  account_status: string;
  last_portal_activity_at: string | null;
  last_portal_login_at: string | null;
  service_addresses: {
    is_current: boolean;
    municipalities: { name: string } | null;
    trash_pickup_schedules: {
      weekday: number | null;
      cleaning_day_assignments: { normal_weekday: number }[];
    }[];
    recycling_pickup_schedules: {
      weekday: number;
      frequency_weeks: number;
      anchor_collection_date: string;
      is_current: boolean;
    }[];
  }[];
  subscriptions: {
    service_alignment: string;
    service_plan_versions: {
      service_plans: { id: string; display_name: string };
    };
  }[];
};

export async function crmCustomers(filters: {
  q?: string;
  plan?: string;
  status?: string;
  municipality?: string;
  pickup?: string;
}) {
  const params = new URLSearchParams({
    select:
      "id,full_name,account_status,last_portal_activity_at,last_portal_login_at,service_addresses(is_current,municipalities(name),trash_pickup_schedules(weekday,cleaning_day_assignments(normal_weekday)),recycling_pickup_schedules(weekday,frequency_weeks,anchor_collection_date,is_current)),subscriptions(service_alignment,service_plan_versions(service_plans(id,display_name)))",
    order: "full_name",
    "service_addresses.is_current": "eq.true",
    "service_addresses.recycling_pickup_schedules.is_current": "eq.true",
    "subscriptions.ended_at": "is.null",
    "subscriptions.order": "started_at.desc.nullslast",
    "subscriptions.limit": "1",
  });
  if (filters.q) {
    params.set("full_name", `ilike.*${filters.q.replace(/[%*,()]/g, "")}*`);
  }
  if (filters.status) params.set("account_status", `eq.${filters.status}`);

  const rows = await databaseRequest<CrmCustomer[]>(`customers?${params}`);
  return rows.filter(
    (customer) =>
      (!filters.plan ||
        customer.subscriptions.some(
          (subscription) =>
            subscription.service_plan_versions.service_plans.id === filters.plan,
        )) &&
      (!filters.municipality ||
        customer.service_addresses.some(
          (address) => address.municipalities?.name === filters.municipality,
        )) &&
      (!filters.pickup ||
        customer.service_addresses.some((address) =>
          address.trash_pickup_schedules.some(
            (pickup) => String(pickup.weekday) === filters.pickup,
          ),
        )),
  );
}

export type ReferralCodeRow = { code: string; customer_id: string };
export type ReferralRelationshipRow = { referrer_customer_id: string; status: string };
export type ReferralOwnerRow = { id: string; full_name: string };

export async function crmReferralTracking() {
  try {
    const [codes, relationships, owners] = await Promise.all([
      databaseRequest<ReferralCodeRow[]>("referral_codes?select=code,customer_id&active=eq.true"),
      databaseRequest<ReferralRelationshipRow[]>("referral_relationships?select=referrer_customer_id,status"),
      databaseRequest<ReferralOwnerRow[]>("customers?select=id,full_name&order=full_name"),
    ]);
    return { available: true, codes, relationships, owners } as const;
  } catch {
    return { available: false, codes: [] as ReferralCodeRow[], relationships: [] as ReferralRelationshipRow[], owners: [] as ReferralOwnerRow[] } as const;
  }
}

export async function crmCustomer(id: string) {
  const safe = /^[0-9a-f-]{36}$/i.test(id) ? id : "00000000-0000-0000-0000-000000000000";
  return (
    await databaseRequest<CustomerRow[]>(
      `customers?id=eq.${safe}&select=${customerSelect}&service_addresses.is_current=eq.true&service_addresses.recycling_pickup_schedules.is_current=eq.true&subscriptions.ended_at=is.null&subscriptions.order=started_at.desc.nullslast&subscriptions.limit=1`,
    )
  )[0] ?? null;
}

export type VisitRow = {
  id: string;
  status: string;
  scheduled_for: string | null;
  cleaning_confirmed: boolean;
  bins_returned: boolean;
  customers: { full_name: string };
  route_stops: {
    service_addresses: {
      line1: string;
      city: string;
      preferred_return_location: string | null;
      access_instructions: string | null;
      animal_warning: string | null;
      bins: { id: string; identifier: string | null; description: string | null }[];
    };
  } | null;
  visit_photographs: { id: string; kind: string }[];
};

export async function visits(id?: string, actionable = false) {
  const statusFilter = actionable ? "status=not.in.(completed,skipped,refused)&" : "";
  return databaseRequest<VisitRow[]>(
    `service_visits?${id ? `id=eq.${id}&` : ""}${statusFilter}select=id,status,scheduled_for,cleaning_confirmed,bins_returned,customers(full_name),route_stops(service_addresses(line1,city,preferred_return_location,access_instructions,animal_warning,bins(id,identifier,description))),visit_photographs(id,kind)&order=scheduled_for`,
  );
}
