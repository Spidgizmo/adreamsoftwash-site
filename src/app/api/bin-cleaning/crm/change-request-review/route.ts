import { NextRequest, NextResponse } from "next/server";
import { currentSession, databaseRequest } from "@/lib/supabase/server";

function safeId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || !["administrator", "dispatcher"].includes(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
  const form = await request.formData();
  const requestId = safeId(String(form.get("request_id") ?? ""));
  const customerId = safeId(String(form.get("customer_id") ?? ""));
  const action = String(form.get("action") ?? "");
  if (!requestId || !customerId || !["approve", "reject"].includes(action)) return NextResponse.json({ ok: false }, { status: 400 });

  const change = (await databaseRequest<{ id: string; service_address_id: string | null; request_type: string; requested_value: Record<string, unknown> | null; status: string }[]>(`customer_change_requests?id=eq.${requestId}&customer_id=eq.${customerId}&select=id,service_address_id,request_type,requested_value,status&limit=1`))[0];
  if (!change) return NextResponse.json({ ok: false }, { status: 404 });

  if (action === "reject") {
    await databaseRequest(`customer_change_requests?id=eq.${requestId}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) });
    return NextResponse.redirect(new URL(`/bin-cleaning/crm/customers/${customerId}?reviewed=rejected`, request.url), 303);
  }

  const addressId = change.service_address_id;
  if (!addressId) return NextResponse.json({ ok: false, error: "Missing service address" }, { status: 409 });
  const value = change.requested_value ?? {};
  const simpleFields: Record<string, string> = {
    return_location: "preferred_return_location",
    access_instructions: "access_instructions",
    gate_information: "gate_information",
    animal_warning: "animal_warning",
  };
  const field = simpleFields[change.request_type];
  if (field) {
    const nextValue = typeof value.value === "string" ? value.value.trim() : "";
    if (!nextValue) return NextResponse.json({ ok: false, error: "Missing requested value" }, { status: 400 });
    await databaseRequest(`service_addresses?id=eq.${addressId}`, { method: "PATCH", body: JSON.stringify({ [field]: nextValue }) });
  } else if (change.request_type === "recycling_schedule") {
    const weekday = Number(value.weekday);
    const frequencyWeeks = Number(value.frequency_weeks);
    const nextCollectionDate = String(value.next_collection_date ?? "");
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !Number.isInteger(frequencyWeeks) || frequencyWeeks < 1 || frequencyWeeks > 4 || !/^\d{4}-\d{2}-\d{2}$/.test(nextCollectionDate)) {
      return NextResponse.json({ ok: false, error: "Invalid recycling request" }, { status: 400 });
    }
    await databaseRequest(`recycling_pickup_schedules?service_address_id=eq.${addressId}&is_current=eq.true`, { method: "PATCH", body: JSON.stringify({ is_current: false }) });
    await databaseRequest("recycling_pickup_schedules", { method: "POST", body: JSON.stringify({ service_address_id: addressId, weekday, frequency_weeks: frequencyWeeks, anchor_collection_date: nextCollectionDate, source: "staff_verified", verification_status: "staff_verified", effective_from: new Date().toISOString().slice(0, 10), is_current: true }) });
  } else {
    return NextResponse.json({ ok: false, error: "Unsupported request type" }, { status: 400 });
  }

  await databaseRequest(`customer_change_requests?id=eq.${requestId}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) });
  return NextResponse.redirect(new URL(`/bin-cleaning/crm/customers/${customerId}?reviewed=approved`, request.url), 303);
}
